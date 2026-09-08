import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { redactDeep, redactText } from "./redact.js";
import { resolveDataRange } from "./timerange.js";
import {
  CHARACTER_LIMIT,
  budgetWarning,
  truncateEventList,
  truncateQueryResult,
  type SeqQueryResult,
} from "./truncate.js";

// Configuration and constants. Read from the environment once at module load so
// both entry points — the stdio server (seq-server.ts) and the remote HTTP
// server (remote.ts) — share the same upstream Seq target. The remote entry's
// OAuth layer only AUTHENTICATES the caller; the Seq API key below is global
// and server-side, exactly like the Lime connector's model.
export const SEQ_BASE_URL = process.env.SEQ_BASE_URL || 'http://localhost:8080';
export const SEQ_API_KEY = process.env.SEQ_API_KEY || '';
const MAX_EVENTS = 50;
// Per-request timeout for Seq API calls. An unbounded fetch could keep a stdio
// call — or a remote /mcp HTTP request — open indefinitely if Seq stalls.
// Configurable via SEQ_REQUEST_TIMEOUT_MS (default 30s); a non-positive/NaN
// value falls back to the default.
//
// Raising it far above the default buys little: the MCP client and (for the
// hosted server) the ingress in front of /mcp impose their own budgets, and
// once one of those fires first the caller gets an opaque transport failure
// instead of the actionable message below — so the recovery advice never
// reaches the model. Keep this comfortably UNDER the client budget and let
// query shape, not the timeout, be the thing that gets fixed.
export const SEQ_REQUEST_TIMEOUT_MS = (() => {
  const raw = Number(process.env.SEQ_REQUEST_TIMEOUT_MS ?? '30000');
  return Number.isFinite(raw) && raw > 0 ? raw : 30000;
})();

// Types for Seq API responses
interface Signal {
  Id: string;
  Title: string;
  Description?: string;
  Filters: unknown[];
  OwnerId?: string;
  IsShared: boolean;
}

interface SeqEvent {
  Id: string;
  Timestamp: string;
  Level: string;
  MessageTemplateTokens?: unknown[];
  RenderedMessage?: string;
  Properties?: Record<string, unknown>;
  Exception?: string;
  [key: string]: unknown;
}

// Helper function for Seq API requests
async function makeSeqRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${SEQ_BASE_URL}${endpoint}`);

  // The API key goes in the X-Seq-ApiKey header only (set below), never in the
  // query string: query-string secrets leak into intermediary/proxy access logs
  // and metrics. The header authenticates Seq API calls on its own.

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (SEQ_API_KEY) {
    headers['X-Seq-ApiKey'] = SEQ_API_KEY;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(SEQ_REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      // The recovery advice is aimed at the MODEL, which cannot change
      // environment variables — so it names the query-shape levers that
      // actually work, in the order that helps most. A timeout here is nearly
      // always a query that scanned too many events, not an unreachable Seq.
      throw new Error(
        `Seq request timed out after ${SEQ_REQUEST_TIMEOUT_MS}ms. Almost always this ` +
        `means the query scanned too many events, NOT that Seq is down — cost scales ` +
        `with the number of events in the time window (WebMed prod ingests roughly 1 ` +
        `million events per hour). Do NOT retry the same query unchanged. Instead, in ` +
        `this order: (1) narrow the window — step down 1d -> 6h -> 1h -> 15m; (2) add a ` +
        `selective predicate (@Level in ['Error','Fatal'], Environment = '<tenant slug>', ` +
        `Application = '<name>') so less has to be aggregated; (3) for a rollup, group at ` +
        `a coarser level or add a 'limit'; (4) if you only need recent examples rather ` +
        `than a count, use get_events with a small 'count' — it scans newest-first and ` +
        `stops once it has enough matches. Only if a narrow 15m query also times out is ` +
        `Seq itself likely unhealthy.`,
      );
    }
    throw err;
  }

  if (!response.ok) {
    let body = '';
    try { body = await response.text(); } catch { /* ignore */ }
    // A Seq error body bypasses the success-path redactDeep yet can echo PII
    // (the filter/query the caller sent, or a log snippet). Redact it before it
    // goes anywhere, and attach a numeric `status` so the logger's errorFields()
    // suppresses even the redacted text from logs (it surfaces only status + a
    // fixed summary). The redacted snippet still reaches the caller (Claude) for
    // self-correction — e.g. an invalid-filter message — without leaking PII.
    const safeBody = body ? await redactText(body) : '';
    const error = new Error(
      `Seq API error ${response.status} (${response.statusText})${safeBody ? `: ${safeBody}` : ''}`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

// Schema for time range validation
const timeRangeSchema = z.enum(['1m', '15m', '30m', '1h', '2h', '6h', '12h', '1d', '7d', '14d', '30d']);

const signalsSchema = z.object({
  ownerId: z.string().optional()
    .describe('Filter signals by owner ID'),
  shared: z.boolean().optional()
    .describe('Filter by shared status. Defaults to true (shared signals only)'),
  partial: z.boolean().optional()
    .describe('Include partial signal matches')
}).strict();

const eventsSchema = z.object({
  signal: z.string().optional()
    .describe('Comma-separated signal IDs to scope results (get IDs from seq_get_signals)'),
  filter: z.string().optional()
    .describe("Seq filter expression, e.g. \"@Level = 'Error'\" or \"StatusCode >= 500\""),
  count: z.number().min(1).max(MAX_EVENTS).optional()
    .default(20)
    .describe(`Number of events to return (1–${MAX_EVENTS}, default 20)`),
  fromDateUtc: z.string().datetime({ offset: true }).optional()
    .describe('Start of time range in UTC ISO 8601, e.g. "2024-01-15T10:00:00Z"'),
  toDateUtc: z.string().datetime({ offset: true }).optional()
    .describe('End of time range in UTC ISO 8601, e.g. "2024-01-15T11:00:00Z"'),
  range: timeRangeSchema.optional()
    .describe('Relative time range; takes precedence over fromDateUtc/toDateUtc. ONLY these values are accepted — 1m, 15m, 30m, 1h, 2h, 6h, 12h, 1d, 7d, 14d, 30d — anything else (4h, 8h, 3d) is rejected before the query runs; use fromDateUtc/toDateUtc for an arbitrary window. Defaults to 1h when omitted'),
  after: z.string().optional()
    .describe('Pagination cursor: pass the last event ID from a previous response to fetch the next page'),
  render: z.boolean().optional()
    .default(false)
    .describe('Render message templates into human-readable strings (adds RenderedMessage to each event)')
}).strict();

const dataSchema = z.object({
  query: z.string().min(1)
    .describe(
      "Seq SQL query. Use 'from stream' for tabular/aggregate queries, e.g. " +
      "\"select count(*) as n from stream group by @Level\" or " +
      "\"select count(*) as n from stream where StatusCode >= 500 group by RequestPath order by n desc limit 20\". " +
      "Three syntax rules Seq enforces (each rejects the query with 400 otherwise): " +
      "LABEL an aggregate with 'as' to sort on it ('order by count(*)' is rejected — use 'count(*) as n ... order by n'); " +
      "do NOT select the grouping column ('group by Environment' already emits it, and selecting it too returns it twice); " +
      "and distinct takes parentheses ('count(distinct(UserId))', not 'count(distinct UserId)'). " +
      "Aggregates: count, sum, mean, min, max, percentile, distinct; time slicing via group by time(<n><unit>). " +
      "Add a 'limit' clause to bound large rowsets."
    ),
  signal: z.string().optional()
    .describe('Comma-separated signal IDs to scope the query (get IDs from get_signals)'),
  fromDateUtc: z.string().datetime({ offset: true }).optional()
    .describe('Start of time range in UTC ISO 8601, e.g. "2024-01-15T10:00:00Z"'),
  toDateUtc: z.string().datetime({ offset: true }).optional()
    .describe('End of time range in UTC ISO 8601, e.g. "2024-01-15T11:00:00Z"'),
  range: timeRangeSchema.optional()
    .describe('Relative time range; takes precedence over fromDateUtc/toDateUtc. ONLY these values are accepted — 1m, 15m, 30m, 1h, 2h, 6h, 12h, 1d, 7d, 14d, 30d — anything else (4h, 8h, 3d) is rejected before the query runs; use fromDateUtc/toDateUtc for an arbitrary window. ALWAYS set this explicitly: the 1d fallback is the most expensive window there is and is the single most common cause of a timeout')
}).strict();

/**
 * Build a fully-configured Seq MCP server with all resources and tools
 * registered. Both the stdio entry point and the remote HTTP entry point call
 * this so the two transports expose an identical tool surface. The remote server
 * builds a fresh instance per request (stateless Streamable HTTP), so this must
 * be cheap and side-effect free beyond registering handlers.
 */
export function createSeqServer(): McpServer {
  const server = new McpServer({
    name: "seq-mcp-server",
    version: "1.0.0"
  });

  // Resource for listing signals
  server.resource(
    "signals",
    "seq://signals",
    {
      description: "List of saved Seq signals that can be used with seq_get_events to filter log events by category or service"
    },
    async () => {
      try {
        const signals = await makeSeqRequest<Signal[]>('/api/signals', { shared: 'true' });
        const formattedSignals = signals.map(signal => ({
          id: signal.Id,
          title: signal.Title,
          description: signal.Description || 'No description provided',
          shared: signal.IsShared,
          ownerId: signal.OwnerId
        }));

        const safeSignals = await redactDeep(formattedSignals);

        return {
          contents: [{
            uri: 'seq://signals',
            text: JSON.stringify(safeSignals, null, 2)
          }]
        };
      } catch (error) {
        console.error('Error fetching signals:', error);
        throw error;
      }
    }
  );

  // Tool: List signals
  server.tool(
    "get_signals",
    "List saved Seq signals (named filters). Use signal IDs with get_events to narrow results to a specific service or category.",
    signalsSchema.shape,
    async ({ ownerId, shared, partial }) => {
      try {
        const params: Record<string, string> = {
          shared: shared?.toString() ?? "true"
        };
        if (ownerId) params.ownerId = ownerId;
        if (partial !== undefined) params.partial = partial.toString();

        const signals = await makeSeqRequest<Signal[]>('/api/signals', params);
        const normalized = signals.map(s => ({
          id: s.Id,
          title: s.Title,
          description: s.Description,
          shared: s.IsShared,
          ownerId: s.OwnerId,
          filters: s.Filters
        }));

        const safeSignals = await redactDeep(normalized);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(safeSignals, null, 2)
          }]
        };
      } catch (error) {
        const err = error as Error;
        return {
          content: [{
            type: "text",
            text: `Error fetching signals: ${err.message}. Verify SEQ_BASE_URL (${SEQ_BASE_URL}) is correct and the server is reachable.`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Get events
  server.tool(
    "get_events",
    `Retrieve raw structured log events from Seq — the newest matches first. Use it to SEE example events (messages, stack traces, properties); use sql_query when the answer is a count or a breakdown.

Cost: this scans newest-first and STOPS once it has 'count' matches, so a wide range is cheap when matches are common and expensive when they are rare (a filter matching nothing scans the whole window).

Tips:
- Keep 'count' small — 5 is usually enough to identify a pattern. One error event with a stack trace can be several thousand characters, so a large count is truncated anyway
- Start narrow ('range: "1h"'), widen only if you find nothing
- Filter expressions use Seq query syntax: @Level in ['Error','Fatal'], StatusCode >= 500, RequestPath like '/api/%', @Exception like '%TimeoutException%'
- Call get_signals first to find signal IDs, and combine signal + filter for precise results
- Use render=true for human-readable messages instead of raw message templates
- Use 'after' with the last event ID to page through large result sets`,
    eventsSchema.shape,
    async ({ signal, filter, count, fromDateUtc, toDateUtc, range, after, render }) => {
      try {
        const params: Record<string, string> = {};

        if (range) {
          params.range = range;
        } else if (fromDateUtc || toDateUtc) {
          if (fromDateUtc) params.fromDateUtc = fromDateUtc;
          if (toDateUtc) params.toDateUtc = toDateUtc;
        } else {
          params.range = '1h';
        }

        if (signal) params.signal = signal;
        if (filter) params.filter = filter;
        if (count) params.count = count.toString();
        if (after) params.after = after;
        if (render) params.render = 'true';

        const startedAt = Date.now();
        const events = await makeSeqRequest<SeqEvent[]>('/api/events', params);
        const durationMs = Date.now() - startedAt;

        // Redact personal data (fødselsnummer, names, email, phone) before the
        // events leave this process. Done up front so truncation operates on the
        // redacted payload and never re-exposes unredacted content.
        const safeEvents = await redactDeep(events);

        const { text } = truncateEventList(safeEvents, CHARACTER_LIMIT);

        // A call that succeeded but nearly exhausted the budget is a warning
        // the caller can act on BEFORE the next query times out. Kept as a
        // separate content block so the JSON payload itself stays parseable.
        const warning = budgetWarning(durationMs, SEQ_REQUEST_TIMEOUT_MS);

        return {
          content: warning
            ? [{ type: "text" as const, text: warning }, { type: "text" as const, text }]
            : [{ type: "text" as const, text }]
        };
      } catch (error) {
        const err = error as Error;
        return {
          content: [{
            type: "text",
            text: `Error fetching events: ${err.message}. Check that filter syntax is valid Seq query syntax and that any signal IDs exist (use get_signals to list them).`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Get alert state
  server.tool(
    "get_alert_state",
    "Get the current state of all Seq alerts. Returns firing, ok, or suppressed status for each configured alert.",
    {},
    async () => {
      try {
        const alertState = await makeSeqRequest<Record<string, unknown>>('/api/alertstate');
        const safeAlertState = await redactDeep(alertState);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(safeAlertState, null, 2)
          }]
        };
      } catch (error) {
        const err = error as Error;
        return {
          content: [{
            type: "text",
            text: `Error fetching alert state: ${err.message}. Verify the Seq server is reachable at ${SEQ_BASE_URL}.`
          }],
          isError: true
        };
      }
    }
  );

  // Tool: Run a SQL-style query (aggregations)
  server.tool(
    "sql_query",
    `Run a Seq SQL-style query for aggregations and tabular analysis (https://datalust.co/docs/sql-queries).

Use this — not get_events — when you need counts, sums, means, percentiles, distinct values, group-by breakdowns, or time-series. get_events returns raw rows; sql_query computes the aggregate server-side.

Examples (note the labelled aggregate, and that the grouping column is NOT selected):
- Errors per service: select count(*) as n from stream where @Level in ['Error','Fatal'] group by Application order by n desc limit 20
- Errors per 5 minutes: select count(*) as n from stream where @Level = 'Error' group by time(5m)
- p95 latency: select percentile(Elapsed, 95) as p95 from stream where RequestPath like '/api/%' group by RequestPath order by p95 desc limit 20
- Distinct users affected: select count(distinct(UserId)) as users from stream where StatusCode >= 500

COST — this is what makes queries time out. An aggregate scans every event in the window, so cost tracks window length, and WebMed prod ingests roughly 1 million events per hour. Measured on prod, 'group by @Level': 15m ~1.5s, 1h ~2.6s, 6h ~8s, 12h ~11s, 1d 11-30s+ — the same 1d query measured 11.5s warm and over 30s (timeout) cold. So:
- ALWAYS set 'range' explicitly. Start at 15m-1h and widen only when you need to; the 1d default is the most expensive window available
- Put a selective 'where' first (@Level in ['Error','Fatal'], Environment = '<slug>', Application = '<name>') — filtering before grouping cut a 6h query from 8.2s to 2.6s
- Coarse buckets: group by time(5m) over an hour, not time(5s); a fine bucket over a wide window returns thousands of slices and gets truncated
- For a long-horizon question, run several narrow windows or one coarse bucket rather than one wide fine-grained query
- On a timeout, narrow the window — do not retry the same query

Tips:
- Call get_signals first to scope the query to a service/category via the 'signal' parameter
- Add a 'limit' clause to large rowsets, or group at a coarser level, if results are truncated`,
    dataSchema.shape,
    async ({ query, signal, fromDateUtc, toDateUtc, range }) => {
      try {
        const { rangeStartUtc, rangeEndUtc } = resolveDataRange(
          { range, fromDateUtc, toDateUtc },
          Date.now()
        );

        const params: Record<string, string> = {
          q: query,
          rangeStartUtc,
          rangeEndUtc
        };
        if (signal) params.signal = signal;

        const startedAt = Date.now();
        const data = await makeSeqRequest<SeqQueryResult>('/api/data', params);
        const durationMs = Date.now() - startedAt;

        // Redact personal data before the result leaves this process. The query
        // can select arbitrary columns (including @Properties holding
        // fødselsnummer, names, emails), so redaction is applied to the whole
        // rowset up front — same GDPR/Personvern guarantee as the other tools.
        const safeData = await redactDeep(data);

        // Trims a tabular `Rows` result AND a `group by time(...)` result, which
        // answers with `Slices` and no top-level `Rows` at all — that shape used
        // to bypass trimming entirely and return payloads several times the limit.
        const { text } = truncateQueryResult(safeData, CHARACTER_LIMIT);

        const warning = budgetWarning(durationMs, SEQ_REQUEST_TIMEOUT_MS);

        return {
          content: warning
            ? [{ type: "text" as const, text: warning }, { type: "text" as const, text }]
            : [{ type: "text" as const, text }]
        };
      } catch (error) {
        const err = error as Error;
        return {
          content: [{
            type: "text",
            text: `Error running query: ${err.message}. Check the SQL syntax (see https://datalust.co/docs/sql-queries) — use 'from stream' for tabular/aggregate queries — and that any signal IDs exist (use get_signals to list them).`
          }],
          isError: true
        };
      }
    }
  );

  return server;
}
