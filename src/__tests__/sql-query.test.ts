import { resolveDataRange, RANGE_MS } from '../timerange.js';
import { redactDeep } from '../redact.js';

// A fixed reference instant so range conversions are deterministic.
const NOW = Date.parse('2026-06-24T12:00:00.000Z');

describe('resolveDataRange', () => {
  it('converts a relative range to start/end bounds anchored at now', () => {
    const { rangeStartUtc, rangeEndUtc } = resolveDataRange({ range: '1h' }, NOW);
    expect(rangeEndUtc).toBe('2026-06-24T12:00:00.000Z');
    expect(rangeStartUtc).toBe('2026-06-24T11:00:00.000Z');
  });

  it('lets a relative range take precedence over explicit dates', () => {
    const { rangeStartUtc, rangeEndUtc } = resolveDataRange(
      { range: '15m', fromDateUtc: '2020-01-01T00:00:00Z', toDateUtc: '2020-01-02T00:00:00Z' },
      NOW
    );
    expect(rangeStartUtc).toBe('2026-06-24T11:45:00.000Z');
    expect(rangeEndUtc).toBe('2026-06-24T12:00:00.000Z');
  });

  it('passes explicit UTC bounds through unchanged', () => {
    const { rangeStartUtc, rangeEndUtc } = resolveDataRange(
      { fromDateUtc: '2026-06-01T00:00:00Z', toDateUtc: '2026-06-02T00:00:00Z' },
      NOW
    );
    expect(rangeStartUtc).toBe('2026-06-01T00:00:00Z');
    expect(rangeEndUtc).toBe('2026-06-02T00:00:00Z');
  });

  it('fills a missing bound when only one explicit date is given', () => {
    const onlyFrom = resolveDataRange({ fromDateUtc: '2026-06-23T00:00:00Z' }, NOW);
    expect(onlyFrom.rangeStartUtc).toBe('2026-06-23T00:00:00Z');
    expect(onlyFrom.rangeEndUtc).toBe('2026-06-24T12:00:00.000Z');

    const onlyTo = resolveDataRange({ toDateUtc: '2026-06-24T06:00:00Z' }, NOW);
    expect(onlyTo.rangeStartUtc).toBe('2026-06-23T12:00:00.000Z'); // now - 24h
    expect(onlyTo.rangeEndUtc).toBe('2026-06-24T06:00:00Z');
  });

  it('defaults to the last 24 hours when no range is supplied', () => {
    const { rangeStartUtc, rangeEndUtc } = resolveDataRange({}, NOW);
    expect(rangeEndUtc).toBe('2026-06-24T12:00:00.000Z');
    expect(rangeStartUtc).toBe('2026-06-23T12:00:00.000Z');
  });

  it('covers every range option exposed by the schema', () => {
    expect(Object.keys(RANGE_MS)).toEqual([
      '1m', '15m', '30m', '1h', '2h', '6h', '12h', '1d', '7d', '14d', '30d',
    ]);
  });
});

describe('redaction of a tabular query result', () => {
  beforeEach(() => {
    delete process.env.SEQ_REDACTION_ENABLED;
  });

  it('masks personal data inside a Columns/Rows rowset', async () => {
    // Shape mirrors what /api/data returns for a tabular query. PII can land in
    // any selected column, so redaction must reach into the nested Rows arrays.
    const rowset = {
      Columns: ['UserEmail', 'Count'],
      Rows: [
        ['ola.nordmann@hospital.no', 12],
        ['kari@example.com', 3], // example.com is intentionally treated as non-PII
      ],
    };

    const safe = await redactDeep(rowset);

    expect(safe.Columns).toEqual(['UserEmail', 'Count']);
    expect(JSON.stringify(safe)).not.toContain('ola.nordmann@hospital.no');
    expect(safe.Rows[0][1]).toBe(12); // numeric aggregate preserved
    expect(safe.Rows[1][0]).toBe('kari@example.com'); // reserved domain left intact
  });
});
