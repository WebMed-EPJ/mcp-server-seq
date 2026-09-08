/**
 * Response-size trimming and query-cost budgeting shared by the Seq MCP tools.
 *
 * Kept in a side-effect-free module (no server bootstrap, no environment reads)
 * so both can be unit-tested without importing `server.ts`, which registers
 * tools and resolves the upstream Seq target on import.
 */

/** Maximum characters a tool result may carry back to the model. */
export const CHARACTER_LIMIT = 25_000;

export interface Trimmed {
  /** The JSON text to return to the caller. */
  text: string;
  /** Whether rows/slices/events had to be dropped to fit the limit. */
  truncated: boolean;
}

/**
 * A Seq `/api/data` response. A tabular query answers with `Rows`; a query
 * carrying `group by time(...)` answers with `Slices` INSTEAD — there is no
 * top-level `Rows` at all. Both must be trimmed, or a time series silently
 * returns a payload many times the limit (`group by time(5s)` over 1h is 5 700
 * lines / 83 000 characters against a 25 000 limit, measured on WebMed prod).
 */
export interface SeqQueryResult {
  Rows?: unknown[];
  Slices?: unknown[];
  [key: string]: unknown;
}

/**
 * Trim a list of events to fit the character limit.
 *
 * Seq returns events newest-first, so the leading half is kept: during an
 * incident the most recent events are the ones being looked for.
 */
export function truncateEventList(events: unknown[], limit = CHARACTER_LIMIT): Trimmed {
  const kept = events.slice();
  const bare = JSON.stringify(kept, null, 2);
  if (bare.length <= limit) {
    return { text: bare, truncated: false };
  }

  // Measure the FINAL meta-wrapped payload, not the bare array: the
  // truncated/returned/message fields can themselves push the response back
  // over the limit.
  const withMeta = () => JSON.stringify({
    truncated: true,
    returned: kept.length,
    truncation_message:
      `Response exceeded ${limit} characters. Lower 'count', narrow 'range', ` +
      `or add a 'filter' expression. Stack traces dominate the size of an error ` +
      `event — count: 5 is usually enough to identify a pattern.`,
    events: kept,
  }, null, 2);

  let text = withMeta();
  // A single oversized event still comes back rather than an empty result.
  while (text.length > limit && kept.length > 1) {
    kept.splice(Math.ceil(kept.length / 2));
    text = withMeta();
  }
  return { text, truncated: true };
}

/**
 * Trim a Seq query result (tabular `Rows` or time-sliced `Slices`) to fit the
 * character limit, preserving the surrounding metadata (`Columns`,
 * `Statistics`, …) either way.
 *
 * `Rows` come back in the order the query's `order by` asked for, so the
 * leading rows — the significant ones — are kept. `Slices` come back
 * oldest-first, so the trailing (most recent) slices are kept instead; the
 * remedy named in the message is a coarser `time()` bucket, which returns the
 * whole window in fewer slices rather than a truncated one.
 */
export function truncateQueryResult(data: SeqQueryResult, limit = CHARACTER_LIMIT): Trimmed {
  const bare = JSON.stringify(data, null, 2);
  if (bare.length <= limit) {
    return { text: bare, truncated: false };
  }

  if (Array.isArray(data.Slices) && data.Slices.length > 1) {
    const slices = data.Slices.slice();
    const withMeta = () => JSON.stringify({
      truncated: true,
      returnedSlices: slices.length,
      truncation_message:
        `Response exceeded ${limit} characters; only the ${slices.length} most recent ` +
        `time slices are shown. Re-run with a coarser bucket — group by time(1h) ` +
        `instead of time(1m) — to cover the whole window in fewer slices.`,
      ...data,
      Slices: slices,
    }, null, 2);

    let text = withMeta();
    while (text.length > limit && slices.length > 1) {
      slices.splice(0, Math.floor(slices.length / 2)); // drop the oldest half
      text = withMeta();
    }
    return { text, truncated: true };
  }

  if (Array.isArray(data.Rows) && data.Rows.length > 1) {
    const rows = data.Rows.slice();
    const withMeta = () => JSON.stringify({
      truncated: true,
      returnedRows: rows.length,
      truncation_message:
        `Response exceeded ${limit} characters and rows were truncated. Add a ` +
        `'limit' clause, group at a coarser level, or narrow the time range.`,
      ...data,
      Rows: rows,
    }, null, 2);

    let text = withMeta();
    while (text.length > limit && rows.length > 1) {
      rows.splice(Math.ceil(rows.length / 2));
      text = withMeta();
    }
    return { text, truncated: true };
  }

  // Nothing trimmable (a single huge row, or a shape carrying neither array):
  // return it as-is rather than an empty result, but don't claim it was trimmed.
  return { text: bare, truncated: false };
}

/**
 * Fraction of the request timeout above which a successful call is reported
 * back as close to the budget. A query at 60% of the budget is one cold cache
 * away from failing: the SAME aggregate over the SAME 24h window measured
 * 11.5s warm and over 30s cold on WebMed prod.
 */
export const BUDGET_WARNING_FRACTION = 0.6;

/**
 * Warn when a call that SUCCEEDED spent most of the timeout budget, so the
 * caller narrows the next query instead of discovering the ceiling by timing
 * out. Returns null while there is comfortable headroom.
 *
 * @param durationMs - Wall-clock duration of the Seq call
 * @param timeoutMs - The configured per-request timeout
 */
export function budgetWarning(durationMs: number, timeoutMs: number): string | null {
  if (!Number.isFinite(durationMs) || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return null;
  }
  if (durationMs < timeoutMs * BUDGET_WARNING_FRACTION) {
    return null;
  }
  const seconds = (durationMs / 1000).toFixed(1);
  const budget = (timeoutMs / 1000).toFixed(0);
  return (
    `This query took ${seconds}s of a ${budget}s timeout budget. Seq cost scales with ` +
    `the number of events in the window, and a cold cache can triple it — do NOT widen ` +
    `the time range from here. Narrow it, or add a selective 'where'/'filter' predicate ` +
    `(@Level, Environment, Application) before asking for more.`
  );
}
