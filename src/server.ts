import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { redactDeep, redactText } from "./redact.js";
import { resolveDataRange } from "./timerange.js";

// Configuration and constants. Read from the environment once at module load so
// both entry points — the stdio server (seq-server.ts) and the remote HTTP
// server (remote.ts) — share the same upstream Seq target. The remote entry's
// OAuth layer only AUTHENTICATES the caller; the Seq API key below is global
// and server-side, exactly like the Lime connector's model.
export const SEQ_BASE_URL = process.env.SEQ_BASE_URL || 'http://localhost:8080';
export const SEQ_API_KEY = process.env.SEQ_API_KEY || '';
const MAX_EVENTS = 50;
const CHARACTER_LIMIT = 25_000;

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

  const response = await fetch(url.toString(), { headers });

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
    .describe('Relative time range; takes precedence over fromDateUtc/toDateUtc. Options: 1m, 15m, 30m, 1h, 2h, 6h, 12h, 1d, 7d, 14d, 30d'),
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
      "\"select count(*) from stream group by @Level\" or " +
      "\"select RequestPath, count(*) from stream where StatusCode >= 500 group by RequestPath order by count(*) desc limit 20\". " +
      "Supports aggregate operators (count, sum, mean, percentile, distinct) and time slicing via group by time(<n><unit>). " +
      "Add a 'limit' clause to bound large rowsets."
    ),
  signal: z.string().optional()
    .describe('Comma-separated signal IDs to scope the query (get IDs from get_signals)'),
  fromDateUtc: z.string().datetime({ offset: true }).optional()
    .describe('Start of time range in UTC ISO 8601, e.g. "2024-01-15T10:00:00Z"'),
  toDateUtc: z.string().datetime({ offset: true }).optional()
    .describe('End of time range in UTC ISO 8601, e.g. "2024-01-15T11:00:00Z"'),
  range: timeRangeSchema.optional()
    .describe('Relative time range; takes precedence over fromDateUtc/toDateUtc. Options: 1m, 15m, 30m, 1h, 2h, 6h, 12h, 1d, 7d, 14d, 30d. Defaults to the last 24h (1d) when omitted')
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
    `Retrieve structured log events from Seq. Use to investigate errors, analyze patterns, or monitor application health.

Tips:
- Call get_signals first to find signal IDs for targeted filtering
- Start with a broad time range, then narrow using filter expressions
- Filter expressions use Seq query syntax, e.g.: @Level = 'Error', StatusCode >= 500, RequestPath like '/api/%'
- Combine signal + filter for precise results
- Use render=true to get human-readable rendered messages instead of raw message templates
- Use the 'after' parameter with the last event ID to page through large result sets`,
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

        const events = await makeSeqRequest<SeqEvent[]>('/api/events', params);

        // Redact personal data (fødselsnummer, names, email, phone) before the
        // events leave this process. Done up front so truncation operates on the
        // redacted payload and never re-exposes unredacted content.
        const safeEvents = await redactDeep(events);

        let text = JSON.stringify(safeEvents, null, 2);
        let truncated = false;
        while (text.length > CHARACTER_LIMIT && safeEvents.length > 1) {
          safeEvents.splice(Math.ceil(safeEvents.length / 2));
          text = JSON.stringify(safeEvents, null, 2);
          truncated = true;
        }

        if (truncated) {
          const meta = { truncated: true, returned: safeEvents.length, truncation_message: `Response exceeded ${CHARACTER_LIMIT} characters. Reduce 'count', narrow the time 'range', or add a 'filter' expression to get more targeted results.` };
          text = JSON.stringify({ ...meta, events: safeEvents }, null, 2);
        }

        return {
          content: [{
            type: "text",
            text
          }]
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

Use this — not get_events — when you need counts, sums, means, percentiles, distinct values, group-by breakdowns, or time-series. get_events returns raw rows; sql_query computes the aggregate server-side, avoiding pulling and counting rows client-side.

Examples:
- Errors per service: select ServiceName, count(*) from stream where @Level = 'Error' group by ServiceName order by count(*) desc
- p95 latency over time: select percentile(Elapsed, 95) from stream group by time(5m)
- Top failing endpoints: select RequestPath, count(*) from stream where StatusCode >= 500 group by RequestPath order by count(*) desc limit 20

Tips:
- Call get_signals first to scope the query to a service/category via the 'signal' parameter
- Default time window is the last 24h; set 'range' or fromDateUtc/toDateUtc to change it
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

        const data = await makeSeqRequest<{ Rows?: unknown[] }>('/api/data', params);

        // Redact personal data before the result leaves this process. The query
        // can select arbitrary columns (including @Properties holding
        // fødselsnummer, names, emails), so redaction is applied to the whole
        // rowset up front — same GDPR/Personvern guarantee as the other tools.
        const safeData = await redactDeep(data);

        let text = JSON.stringify(safeData, null, 2);
        // Tabular rowsets can be large; if the response exceeds the limit, trim
        // the Rows array (when present) rather than returning nothing. The size is
        // measured on the final meta-wrapped form (including the truncated/
        // returnedRows/message fields) so the returned payload stays under the
        // limit. A single oversized row can still exceed it — we keep one row
        // rather than return an empty rowset, matching get_events.
        if (text.length > CHARACTER_LIMIT && Array.isArray(safeData.Rows) && safeData.Rows.length > 1) {
          const rows = safeData.Rows;
          const withMeta = () => ({
            truncated: true,
            returnedRows: rows.length,
            truncation_message: `Response exceeded ${CHARACTER_LIMIT} characters and rows were truncated. Add a 'limit' clause, narrow the time range, or group at a coarser level.`,
            ...safeData
          });
          text = JSON.stringify(withMeta(), null, 2);
          while (text.length > CHARACTER_LIMIT && rows.length > 1) {
            rows.splice(Math.ceil(rows.length / 2));
            text = JSON.stringify(withMeta(), null, 2);
          }
        }

        return {
          content: [{
            type: "text",
            text
          }]
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
