import {
  CHARACTER_LIMIT,
  budgetWarning,
  truncateEventList,
  truncateQueryResult,
} from '../truncate.js';

/** A row wide enough that a handful of them blow past a small test limit. */
const wideRow = (i: number) => [`row-${i}`, 'x'.repeat(200), i];

describe('truncateQueryResult', () => {
  it('returns a small result untouched and unwrapped', () => {
    const data = { Columns: ['n'], Rows: [[1]], Statistics: { ElapsedMilliseconds: 12 } };

    const { text, truncated } = truncateQueryResult(data);

    expect(truncated).toBe(false);
    expect(JSON.parse(text)).toEqual(data);
  });

  it('trims a tabular Rows result and keeps the leading (ordered) rows', () => {
    const data = { Columns: ['a', 'b', 'n'], Rows: Array.from({ length: 200 }, (_, i) => wideRow(i)) };

    const { text, truncated } = truncateQueryResult(data, 2_000);
    const parsed = JSON.parse(text);

    expect(truncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(2_000);
    expect(parsed.truncated).toBe(true);
    expect(parsed.returnedRows).toBe(parsed.Rows.length);
    expect(parsed.Rows.length).toBeLessThan(200);
    expect(parsed.Rows[0][0]).toBe('row-0'); // most significant row survives
    expect(parsed.Columns).toEqual(['a', 'b', 'n']); // metadata preserved
    expect(parsed.truncation_message).toMatch(/limit/);
  });

  it('trims a group-by-time Slices result, which carries no top-level Rows', () => {
    // Regression: a `group by time(...)` response has `Slices` instead of
    // `Rows`, so it used to bypass trimming entirely — `group by time(5s)` over
    // 1h returned 83 000 characters against a 25 000 limit on WebMed prod.
    const data = {
      Columns: ['n'],
      TimeColumnMetadata: { IntervalTicks: 50_000_000 },
      Slices: Array.from({ length: 720 }, (_, i) => ({
        Time: new Date(Date.UTC(2026, 8, 8, 0, 0, i * 5)).toISOString(),
        Rows: [[i]],
      })),
      Statistics: { ElapsedMilliseconds: 1145 },
    };

    expect(JSON.stringify(data, null, 2).length).toBeGreaterThan(CHARACTER_LIMIT);

    const { text, truncated } = truncateQueryResult(data);
    const parsed = JSON.parse(text);

    expect(truncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(CHARACTER_LIMIT);
    expect(parsed.Slices.length).toBeLessThan(720);
    expect(parsed.returnedSlices).toBe(parsed.Slices.length);
    // Slices arrive oldest-first, so the MOST RECENT ones are the ones kept.
    expect(parsed.Slices[parsed.Slices.length - 1].Rows[0][0]).toBe(719);
    expect(parsed.truncation_message).toMatch(/coarser bucket/);
    expect(parsed.TimeColumnMetadata).toEqual({ IntervalTicks: 50_000_000 });
  });

  it('does not mutate the caller\'s result object', () => {
    const rows = Array.from({ length: 100 }, (_, i) => wideRow(i));
    const data = { Rows: rows };

    truncateQueryResult(data, 1_000);

    expect(data.Rows.length).toBe(100);
  });

  it('returns a single oversized row rather than an empty rowset', () => {
    const data = { Rows: [['x'.repeat(5_000)]] };

    const { text, truncated } = truncateQueryResult(data, 1_000);

    expect(truncated).toBe(false); // nothing could be dropped
    expect(JSON.parse(text).Rows.length).toBe(1);
  });
});

describe('truncateEventList', () => {
  it('returns a small list as a bare array', () => {
    const events = [{ Id: 'event-1', Level: 'Error' }];

    const { text, truncated } = truncateEventList(events);

    expect(truncated).toBe(false);
    expect(JSON.parse(text)).toEqual(events);
  });

  it('trims to fit and keeps the newest events, which Seq returns first', () => {
    const events = Array.from({ length: 50 }, (_, i) => ({
      Id: `event-${i}`,
      Exception: 'at Some.Frame()\n'.repeat(40), // stack traces dominate event size
    }));

    const { text, truncated } = truncateEventList(events);
    const parsed = JSON.parse(text);

    expect(truncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(CHARACTER_LIMIT);
    expect(parsed.returned).toBe(parsed.events.length);
    expect(parsed.events[0].Id).toBe('event-0');
    expect(parsed.truncation_message).toMatch(/count/);
  });

  it('does not mutate the caller\'s array', () => {
    const events = Array.from({ length: 50 }, (_, i) => ({ Id: `event-${i}`, Exception: 'x'.repeat(2_000) }));

    truncateEventList(events);

    expect(events.length).toBe(50);
  });
});

describe('budgetWarning', () => {
  it('stays quiet while there is headroom', () => {
    expect(budgetWarning(1_500, 30_000)).toBeNull();
    expect(budgetWarning(8_200, 30_000)).toBeNull();
  });

  it('warns once a successful call has eaten most of the budget', () => {
    const warning = budgetWarning(19_000, 30_000);

    expect(warning).toContain('19.0s');
    expect(warning).toContain('30s');
    expect(warning).toMatch(/do NOT widen/i);
  });

  it('scales with a configured timeout rather than a hard-coded 30s', () => {
    expect(budgetWarning(19_000, 60_000)).toBeNull();
    expect(budgetWarning(40_000, 60_000)).toContain('60s');
  });

  it('says nothing for a nonsensical budget', () => {
    expect(budgetWarning(100, 0)).toBeNull();
    expect(budgetWarning(Number.NaN, 30_000)).toBeNull();
  });
});
