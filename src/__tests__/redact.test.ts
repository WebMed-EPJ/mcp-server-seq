import { redactText, redactDeep } from '../redact.js';

// Structurally valid (synthetic) Norwegian identity numbers with correct
// MOD11 control digits, used to verify detection without using a real
// person's number.
const VALID_FNR = '13116900216';
const LEADING_ZERO_FNR = '05069010042'; // born day 05 → 10 digits as a number
const H_NUMBER = '13114690281'; // H-number: month 46 → 06
const FH_NUMBER = '81234567055'; // FH-number: first digit 8, no date

describe('redactText', () => {
  beforeEach(() => {
    delete process.env.SEQ_REDACTION_ENABLED;
  });

  it('masks a valid Norwegian fødselsnummer', async () => {
    const out = await redactText(`Pasient ${VALID_FNR} innlagt`);
    expect(out).not.toContain(VALID_FNR);
    expect(out).toContain('FNR');
  });

  it('masks fødselsnummer written with a space after the date part', async () => {
    const spaced = `${VALID_FNR.slice(0, 6)} ${VALID_FNR.slice(6)}`;
    const out = await redactText(`Fnr: ${spaced}`);
    expect(out).not.toContain(spaced);
  });

  it('leaves unrelated 11-digit numbers intact', async () => {
    // Epoch-millis-like value that is not a valid fødselsnummer.
    const notFnr = '17000000000';
    const out = await redactText(`ts=${notFnr}`);
    expect(out).toContain(notFnr);
  });

  it('masks H-numbers and FH-numbers (healthcare identifiers)', async () => {
    const hOut = await redactText(`Hjelpenummer ${H_NUMBER} registrert`);
    expect(hOut).not.toContain(H_NUMBER);
    const fhOut = await redactText(`FH-nummer ${FH_NUMBER} registrert`);
    expect(fhOut).not.toContain(FH_NUMBER);
  });

  it('masks a Norwegian person name', async () => {
    // Names are matched against a curated Norwegian name dictionary (see
    // README) — best-effort, guarding the common case rather than every name.
    const out = await redactText('Pasient Kari Nordmann ble innlagt');
    expect(out).not.toContain('Kari Nordmann');
    expect(out).toContain('NAME');
  });

  it('masks both parts of a hyphenated surname', async () => {
    const out = await redactText('kontakt Ingrid Solberg-Haugen');
    expect(out).not.toContain('Solberg');
    expect(out).not.toContain('Haugen');
  });

  // Regression guard for the openredaction semicolon limitation (issue #26):
  // a delimiter in the text must not suppress detection elsewhere.
  it('still masks PII when the text contains semicolons', async () => {
    const out = await redactText(
      `Lege Kari Nordmann; fnr ${VALID_FNR}; e-post ola@helse-bergen.no; tlf +47 99 88 77 66`,
    );
    expect(out).not.toContain('Kari Nordmann');
    expect(out).not.toContain(VALID_FNR);
    expect(out).not.toContain('ola@helse-bergen.no');
    expect(out).not.toContain('99 88 77 66');
    // Delimiters are preserved.
    expect(out.match(/;/g)?.length).toBe(3);
  });

  it('masks PII across newline-separated lines', async () => {
    const out = await redactText('linje1 Kari Nordmann\nlinje2 ola@helse-bergen.no');
    expect(out).not.toContain('Kari Nordmann');
    expect(out).not.toContain('ola@helse-bergen.no');
    expect(out).toContain('\n');
  });

  it('masks email addresses', async () => {
    // A real domain — the library deliberately ignores reserved example/test
    // domains (example.com, example.no, …) since they cannot carry real PII.
    const out = await redactText('Kontakt kari.nordmann@helse-bergen.no for mer info');
    expect(out).not.toContain('kari.nordmann@helse-bergen.no');
  });

  it('masks a Norwegian phone number in +47 format', async () => {
    const out = await redactText('Ring meg på +47 99 88 77 66 i dag');
    expect(out).not.toContain('99 88 77 66');
    expect(out).toContain('PHONE');
  });

  it('returns text unchanged when redaction is disabled', async () => {
    process.env.SEQ_REDACTION_ENABLED = 'false';
    const input = `Pasient ${VALID_FNR}, kari.nordmann@helse-bergen.no`;
    const out = await redactText(input);
    expect(out).toBe(input);
  });
});

describe('redactDeep', () => {
  beforeEach(() => {
    delete process.env.SEQ_REDACTION_ENABLED;
  });

  it('recursively redacts nested objects and arrays while preserving structure', async () => {
    const event = {
      Id: 'event-123',
      Level: 'Information',
      RenderedMessage: `Pasient ${VALID_FNR} kontaktet via kari.nordmann@helse-bergen.no`,
      Properties: {
        StatusCode: 200,
        Notes: [`Ring ${VALID_FNR}`],
      },
    };

    const out = await redactDeep(event);
    const serialized = JSON.stringify(out);

    expect(out.Id).toBe('event-123');
    expect(out.Level).toBe('Information');
    expect(out.Properties.StatusCode).toBe(200);
    expect(serialized).not.toContain(VALID_FNR);
    expect(serialized).not.toContain('kari.nordmann@helse-bergen.no');
    expect(Array.isArray(out.Properties.Notes)).toBe(true);
  });

  it('masks a fødselsnummer stored as a numeric value', async () => {
    const out = await redactDeep({ NationalId: Number(VALID_FNR) });
    expect(String(out.NationalId)).not.toBe(VALID_FNR);
  });

  it('masks a numeric fødselsnummer that lost its leading zero', async () => {
    // Stored as a JS number this is 10 digits; it must still be masked.
    const numeric = Number(LEADING_ZERO_FNR);
    expect(String(numeric).length).toBe(10);
    const out = await redactDeep({ NationalId: numeric });
    expect(String(out.NationalId)).not.toBe(String(numeric));
    expect(String(out.NationalId)).toContain('FNR');
  });
});
