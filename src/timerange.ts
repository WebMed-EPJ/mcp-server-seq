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
    return {
      rangeStartUtc: fromDateUtc ?? new Date(now - DEFAULT_QUERY_RANGE_MS).toISOString(),
      rangeEndUtc: toDateUtc ?? new Date(now).toISOString(),
    };
  }

  return {
    rangeStartUtc: new Date(now - DEFAULT_QUERY_RANGE_MS).toISOString(),
    rangeEndUtc: new Date(now).toISOString(),
  };
}
