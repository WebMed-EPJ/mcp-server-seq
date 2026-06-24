/**
 * Time-range helpers shared by the Seq MCP tools.
 *
 * Kept in a side-effect-free module (no server bootstrap) so the conversion
 * logic can be unit-tested without importing `seq-server.ts`, which starts the
 * stdio transport on import.
 */

/**
 * Supported relative time ranges, mapped to their length in milliseconds.
 * `m` = minute, `h` = hour, `d` = day (note: `1m` is one minute, not month,
 * consistent with the `get_events` tool).
 */
export const RANGE_MS = {
  '1m': 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1h': 3_600_000,
  '2h': 2 * 3_600_000,
  '6h': 6 * 3_600_000,
  '12h': 12 * 3_600_000,
  '1d': 86_400_000,
  '7d': 7 * 86_400_000,
  '14d': 14 * 86_400_000,
  '30d': 30 * 86_400_000,
} as const;

export type RelativeRange = keyof typeof RANGE_MS;

/** Default window for SQL queries when no range is supplied (matches Seq's own 24h default). */
const DEFAULT_QUERY_RANGE_MS = RANGE_MS['1d'];

export interface RangeInput {
  /** Relative range (e.g. '1h'); takes precedence over fromDateUtc/toDateUtc. */
  range?: RelativeRange;
  /** Explicit start of range, UTC ISO 8601. */
  fromDateUtc?: string;
  /** Explicit end of range, UTC ISO 8601. */
  toDateUtc?: string;
}

/**
 * Resolve a time range into the explicit `rangeStartUtc`/`rangeEndUtc` pair
 * that Seq's `/api/data` query endpoint expects.
 *
 * Precedence: a relative `range` wins over explicit dates; if neither is given,
 * the last 24 hours are used (Seq's default query window).
 *
 * @param input - Relative range and/or explicit UTC ISO bounds
 * @param now - Current time in epoch milliseconds (injected for testability)
 * @returns The resolved `{ rangeStartUtc, rangeEndUtc }` as UTC ISO 8601 strings
 */
export function resolveDataRange(
  input: RangeInput,
  now: number,
): { rangeStartUtc: string; rangeEndUtc: string } {
  const { range, fromDateUtc, toDateUtc } = input;

  if (range) {
    return {
      rangeStartUtc: new Date(now - RANGE_MS[range]).toISOString(),
      rangeEndUtc: new Date(now).toISOString(),
    };
  }

  if (fromDateUtc || toDateUtc) {
    // Derive a missing bound relative to the one provided, not relative to
    // `now`. A `from`-only query reads "everything since then" (from..now); a
    // `to`-only query reads "the 24h window ending then" ((to-24h)..to). Anchor
    // the to-only start on `toDateUtc` so a `toDateUtc` older than 24h ago can't
    // produce an inverted start>end range that Seq rejects or returns empty for.
    const parsedTo = toDateUtc ? Date.parse(toDateUtc) : now;
    const endMs = Number.isNaN(parsedTo) ? now : parsedTo; // malformed `to` falls through to Seq for a clear error
    const rangeStartUtc = fromDateUtc ?? new Date(endMs - DEFAULT_QUERY_RANGE_MS).toISOString();
    const rangeEndUtc = toDateUtc ?? new Date(now).toISOString();

    // Reject an explicit start that is after the end (e.g. fromDateUtc later
    // than toDateUtc, or a future fromDateUtc with no toDateUtc). The schema
    // validates each bound's ISO format, but cross-field ordering can only be
    // enforced here — server.tool() rebuilds the param schema from the raw
    // shape, dropping any object-level refinement. Surfaced as a tool error
    // before any Seq request is made.
    const startMs = Date.parse(rangeStartUtc);
    const finalEndMs = Date.parse(rangeEndUtc);
    if (!Number.isNaN(startMs) && !Number.isNaN(finalEndMs) && startMs > finalEndMs) {
      // Name the end bound by its real source: an explicit toDateUtc, or the
      // current time when only a (future) fromDateUtc was given.
      const endLabel = toDateUtc ? `toDateUtc (${rangeEndUtc})` : `the current time (${rangeEndUtc})`;
      throw new RangeError(`Invalid time range: fromDateUtc (${rangeStartUtc}) is after ${endLabel}.`);
    }

    return { rangeStartUtc, rangeEndUtc };
  }

  return {
    rangeStartUtc: new Date(now - DEFAULT_QUERY_RANGE_MS).toISOString(),
    rangeEndUtc: new Date(now).toISOString(),
  };
}
