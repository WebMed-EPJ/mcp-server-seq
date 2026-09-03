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

  it('masks ambiguous common-word names only as part of a full name', async () => {
    // "Per Berg" is a full name → both masked.
    const fullName = await redactText('Per Berg ringte');
    expect(fullName).not.toContain('Per');
    expect(fullName).not.toContain('Berg');
  });

  it('does not mask standalone common words that happen to be names', async () => {
    // "Else", "Per", "Tom", "Odd" alone are ordinary log/code words → kept.
    for (const input of ['Else if request failed', 'Per second the rate was high', 'Tom buffer; Odd behaviour']) {
      expect(await redactText(input)).toBe(input);
    }
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

  it('masks a Norwegian phone number in 0047 format', async () => {
    const out = await redactText('Ring 0047 99 88 77 66 i dag');
    expect(out).not.toContain('99 88 77 66');
    expect(out).toContain('PHONE');
  });

  it('does not partially redact a +47 prefix on a longer digit run', async () => {
    // A 10-digit run after +47 is not a valid 8-digit number; it must be left
    // intact rather than having its first 8 digits masked.
    const input = 'ref +47 1234567890 end';
    expect(await redactText(input)).toBe(input);
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

// Synthetic GUIDs. `PatientId` is a canonical 36-character GUID in WebMed's
// logs, so these stand in for a patient identifier; the CORRELATION one is
// identical in form and must survive, which is the whole reason masking is
// keyed on the property name rather than the value.
const PATIENT_GUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const OTHER_PATIENT_GUID = '9c1f0b7e-2d34-4a11-8f6d-5b7c8e9a0d12';
const CORRELATION_GUID = '7d2e4a90-11bc-4f88-9a3e-6c5d4b3a2f10';
const PLACEHOLDER = /^\[PSEUDONYM_[0-9a-f]{8}\]$/;

/**
 * All placeholders in a redacted payload, in order of appearance.
 *
 * @param value - The redacted value
 * @returns The `[PSEUDONYM_…]` placeholders found in its JSON form
 */
function placeholders(value: unknown): string[] {
  return JSON.stringify(value)?.match(/\[PSEUDONYM_[0-9a-f]{8}\]/g) ?? [];
}

describe('pseudonymous identifier masking', () => {
  beforeEach(() => {
    delete process.env.SEQ_REDACTION_ENABLED;
    delete process.env.SEQ_PSEUDONYM_ID_PROPERTIES;
    // A fixed salt makes the digests reproducible across the whole suite. In
    // production the salt defaults to a random per-process value — see
    // pseudonymSalt() — so the placeholder is not a verifiable hash of the
    // identifier.
    process.env.SEQ_PSEUDONYM_SALT = 'test-salt';
  });

  afterEach(() => {
    delete process.env.SEQ_PSEUDONYM_SALT;
    delete process.env.SEQ_PSEUDONYM_ID_PROPERTIES;
  });

  it('masks a PatientId GUID and leaves an unrelated GUID intact', async () => {
    const out = await redactDeep({
      Properties: { PatientId: PATIENT_GUID, CorrelationId: CORRELATION_GUID },
    });

    expect(out.Properties.PatientId).not.toContain(PATIENT_GUID);
    expect(out.Properties.PatientId).toMatch(PLACEHOLDER);
    // A correlation id is indistinguishable from a patient id by VALUE; it must
    // stay readable, or log analysis becomes impossible.
    expect(out.Properties.CorrelationId).toBe(CORRELATION_GUID);
  });

  it('maps the same identifier to the same placeholder within a response', async () => {
    const out = await redactDeep({
      events: [
        { Properties: { PatientId: PATIENT_GUID } },
        { Properties: { PatientId: PATIENT_GUID } },
        { Properties: { PatientId: OTHER_PATIENT_GUID } },
      ],
    });

    const [first, second, third] = placeholders(out);
    // Determinism is what keeps a debugging session able to see that two events
    // concern the same patient.
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });

  it('is deterministic across responses for a given salt', async () => {
    const first = await redactDeep({ PatientId: PATIENT_GUID });
    const second = await redactDeep({ PatientId: PATIENT_GUID });
    expect(first.PatientId).toBe(second.PatientId);
  });

  it('produces different placeholders under a different salt', async () => {
    const first = await redactDeep({ PatientId: PATIENT_GUID });
    process.env.SEQ_PSEUDONYM_SALT = 'another-salt';
    const second = await redactDeep({ PatientId: PATIENT_GUID });
    expect(second.PatientId).not.toBe(first.PatientId);
    expect(second.PatientId).toMatch(PLACEHOLDER);
  });

  it('treats brace and case variants of a GUID as the same identifier', async () => {
    const out = await redactDeep({
      a: { PatientId: PATIENT_GUID },
      b: { PatientId: PATIENT_GUID.toUpperCase() },
      c: { PatientId: `{${PATIENT_GUID}}` },
    });

    expect(out.a.PatientId).toBe(out.b.PatientId);
    expect(out.a.PatientId).toBe(out.c.PatientId);
  });

  it('masks a Seq { Name, Value } event property pair', async () => {
    // /api/events returns event properties as name/value objects, so the
    // identifier's name is a VALUE in the payload, not the object key.
    const out = await redactDeep({
      Properties: [
        { Name: 'PatientId', Value: PATIENT_GUID },
        { Name: 'StatusCode', Value: 200 },
      ],
    });

    expect(out.Properties[0].Value).toMatch(PLACEHOLDER);
    expect(out.Properties[0].Name).toBe('PatientId');
    expect(out.Properties[1].Value).toBe(200);
  });

  it('masks a message-template token { PropertyName, FormattedValue }', async () => {
    const out = await redactDeep({
      MessageTemplateTokens: [
        { Text: 'Hentet journal for ' },
        { PropertyName: 'PatientId', RawText: '{PatientId}', FormattedValue: PATIENT_GUID },
      ],
    });

    expect(out.MessageTemplateTokens[1].FormattedValue).toMatch(PLACEHOLDER);
    expect(out.MessageTemplateTokens[0].Text).toBe('Hentet journal for ');
  });

  it('masks identifier columns of a sql_query rowset and keeps the aggregates', async () => {
    // `select PatientId, count(*) from stream group by PatientId` puts the
    // column NAME in a sibling array, so neither the key rule nor the
    // name/value rule sees it.
    const out = await redactDeep({
      Columns: ['PatientId', 'count(*)'],
      Rows: [
        [PATIENT_GUID, 12],
        [OTHER_PATIENT_GUID, 3],
      ],
    });

    expect(out.Columns).toEqual(['PatientId', 'count(*)']);
    expect(out.Rows[0][0]).toMatch(PLACEHOLDER);
    expect(out.Rows[1][0]).toMatch(PLACEHOLDER);
    expect(out.Rows[0][0]).not.toBe(out.Rows[1][0]);
    expect(out.Rows[0][1]).toBe(12);
    expect(out.Rows[1][1]).toBe(3);
  });

  it('masks a rowset column whose header wraps the identifier in an expression', async () => {
    const out = await redactDeep({
      Columns: ['distinct(PatientId)'],
      Rows: [[PATIENT_GUID]],
    });
    expect(out.Rows[0][0]).toMatch(PLACEHOLDER);
  });

  it('gives a rendered message the same placeholder as the structured field', async () => {
    // The rendered message repeats the GUID without naming the property, so it
    // is only reachable via the value collected from Properties.
    const out = await redactDeep({
      RenderedMessage: `Hentet journal for ${PATIENT_GUID} pa 42 ms`,
      Properties: { PatientId: PATIENT_GUID },
    });

    expect(out.RenderedMessage).not.toContain(PATIENT_GUID);
    expect(out.RenderedMessage).toContain(out.Properties.PatientId);
    // Unrelated numbers in the message are untouched.
    expect(out.RenderedMessage).toContain('42 ms');
  });

  it('masks a value collected later in the payload than the message using it', async () => {
    // Collection runs over the whole response before any masking, so walk order
    // must not matter.
    const out = await redactDeep([
      { RenderedMessage: `Sletter samtykke for ${PATIENT_GUID}` },
      { Properties: { PatientId: PATIENT_GUID } },
    ]);
    expect(JSON.stringify(out)).not.toContain(PATIENT_GUID);
  });

  it('masks an identifier that names its own property inside a string', async () => {
    // The Seq error path redacts a raw body through redactText alone, with no
    // surrounding structure to inspect.
    const body = `{"Error":"The expression PatientId = '${PATIENT_GUID}' is invalid"}`;
    const out = await redactText(body);
    expect(out).not.toContain(PATIENT_GUID);
    expect(out).toContain('PatientId');
    expect(out).toContain('is invalid');
  });

  it('masks a JSON-quoted identifier in a raw body', async () => {
    const out = await redactText(`{"PatientId":"${PATIENT_GUID}"}`);
    expect(out).not.toContain(PATIENT_GUID);
  });

  it('does not splice the placeholder into the property name itself', async () => {
    // Regression: the value `tId` also occurs inside "PatientId", so masking
    // must splice at the LAST occurrence in the match, not the first.
    const out = await redactText("filter: PatientId = 'tId'");
    expect(out).toMatch(/^filter: PatientId = '\[PSEUDONYM_[0-9a-f]{8}\]'$/);
  });

  it('leaves ordinary prose after an identifier name intact', async () => {
    const input = 'PatientId mangler i forespørselen, PatientId er ukjent';
    expect(await redactText(input)).toBe(input);
  });

  it('masks a numeric identifier stored under an identifier property', async () => {
    const out = await redactDeep({ PatientId: 4711 });
    expect(out.PatientId).toMatch(PLACEHOLDER);
  });

  it('does not sweep a short numeric identifier out of unrelated free text', async () => {
    // A small integer id also occurs as a duration or a count; replacing it
    // everywhere would corrupt the logs. The property itself is still masked.
    const out = await redactDeep({
      PatientId: 4711,
      RenderedMessage: 'Ferdig etter 4711 ms',
    });
    expect(out.PatientId).toMatch(PLACEHOLDER);
    expect(out.RenderedMessage).toBe('Ferdig etter 4711 ms');
  });

  it('masks a non-scalar value under an identifier property (fail-closed)', async () => {
    const out = await redactDeep({ PatientId: { Id: PATIENT_GUID, Source: 'EPJ' } });
    expect(JSON.stringify(out)).not.toContain(PATIENT_GUID);
    expect(out.PatientId).toMatch(PLACEHOLDER);
  });

  it('leaves a null identifier as null rather than masking a non-value', async () => {
    const out = await redactDeep({ PatientId: null });
    expect(out.PatientId).toBeNull();
  });

  it('masks PatientGuid as well as PatientId', async () => {
    const out = await redactDeep({ PatientGuid: PATIENT_GUID });
    expect(out.PatientGuid).toMatch(PLACEHOLDER);
  });

  it('extends the property list from SEQ_PSEUDONYM_ID_PROPERTIES', async () => {
    process.env.SEQ_PSEUDONYM_ID_PROPERTIES = 'UserId, DoctorId';
    const out = await redactDeep({ UserId: CORRELATION_GUID, DoctorId: 99 });
    expect(out.UserId).toMatch(PLACEHOLDER);
    expect(out.DoctorId).toMatch(PLACEHOLDER);
  });

  it('cannot switch off the built-in properties via the env list', async () => {
    // The env var extends the defaults; it can never shrink them.
    process.env.SEQ_PSEUDONYM_ID_PROPERTIES = 'SomethingElse';
    const out = await redactDeep({ PatientId: PATIENT_GUID });
    expect(out.PatientId).toMatch(PLACEHOLDER);
  });

  it('keeps the placeholder intact through the other redaction passes', async () => {
    // The `_` in the placeholder is what stops the \b-anchored phone and
    // fødselsnummer patterns from matching its digits.
    const out = await redactDeep({
      PatientId: PATIENT_GUID,
      RenderedMessage: `Pasient ${PATIENT_GUID} ringte fra 99 88 77 66`,
    });
    expect(out.PatientId).toMatch(PLACEHOLDER);
    expect(out.RenderedMessage).toContain(out.PatientId);
    expect(out.RenderedMessage).not.toContain('99 88 77 66');
  });

  it('returns the payload untouched when redaction is disabled', async () => {
    process.env.SEQ_REDACTION_ENABLED = 'false';
    const event = { Properties: { PatientId: PATIENT_GUID } };
    expect(await redactDeep(event)).toEqual(event);
  });
});
