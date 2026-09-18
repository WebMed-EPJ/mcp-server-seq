import { stripGuids } from '../guids.js';
import { redactDeep, redactText } from '../redact.js';

// A WebMed EPJ patient is identified by a GUID, and the test instance shows them
// arriving as a hyphenated `PatientId` property. These tests cover the wiring in
// redact.ts; the patterns themselves are covered by the shared module's own
// tests in WebMed-EPJ/claude-plugins (this file is the byte-identical copy's
// consumer, not its unit test).
const PATIENT_GUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const OTHER_GUID = '11111111-2222-3333-4444-555555555555';
const TRACE_ID = '83962ea8b94ea36ab8f31d795ba94785';
const EVENT_ID = 'event-49513f6f15c508df5e0f000000000000';

describe('GUID masking in Seq payloads', () => {
  beforeEach(() => {
    delete process.env.SEQ_REDACTION_ENABLED;
    delete process.env.SEQ_BASE_URL;
  });

  it('masks a GUID in free text', async () => {
    expect(await redactText(`Oppslag feilet for ${PATIENT_GUID}`)).toBe(
      'Oppslag feilet for [GUID_1]',
    );
  });

  it('masks a patient id property but keeps the machine identifiers', async () => {
    const event = {
      Id: EVENT_ID,
      TraceId: TRACE_ID,
      SpanId: '64899931f24515a7',
      RenderedMessage: `Journal åpnet for ${PATIENT_GUID}`,
      Links: { Self: `api/events/${EVENT_ID}` },
      Properties: [
        { Name: 'PatientId', Value: PATIENT_GUID },
        { Name: 'TraceId', Value: TRACE_ID },
      ],
    };
    const out = await redactDeep(event);
    // The identifier the control exists for — masked in the message and in the
    // property, with the SAME marker, because one event is one item.
    expect(out.RenderedMessage).toBe('Journal åpnet for [GUID_1]');
    expect(out.Properties[0].Value).toBe('[GUID_1]');
    // Handles survive: masking these costs request correlation and the paging
    // cursor, and protects nobody.
    expect(out.Id).toBe(EVENT_ID);
    expect(out.TraceId).toBe(TRACE_ID);
    expect(out.Links.Self).toBe(`api/events/${EVENT_ID}`);
    // …including a trace id that arrives in Seq's { Name, Value } property shape,
    // where the key deciding the exemption is the sibling Name, not "Value".
    expect(out.Properties[1].Value).toBe(TRACE_ID);
  });

  it('does not let an ordinary object shelter a value behind a Name field', async () => {
    // Only a real { Name, Value } pair is treated as a Seq property; an object
    // that merely mentions a name must not exempt its own Value.
    const out = await redactDeep({ Name: 'PatientId', Value: PATIENT_GUID });
    expect(out.Value).toBe('[GUID_1]');
  });

  it('numbers aliases per EVENT, not per page', async () => {
    // Two events referencing the same patient must not be linkable through their
    // markers — that is the linkage the mask exists to remove.
    const page = await redactDeep([
      { RenderedMessage: `først ${OTHER_GUID}`, Extra: `og ${PATIENT_GUID}` },
      { RenderedMessage: `samme pasient ${PATIENT_GUID}` },
    ]);
    expect(page[0].RenderedMessage).toBe('først [GUID_1]');
    expect(page[0].Extra).toBe('og [GUID_2]');
    expect(page[1].RenderedMessage).toBe('samme pasient [GUID_1]');
  });

  it('is skipped with the rest of redaction against the test instance', async () => {
    process.env.SEQ_REDACTION_ENABLED = 'false';
    process.env.SEQ_BASE_URL = 'https://seq.k8s.webmedepj.no';
    expect(await redactText(`sak ${PATIENT_GUID}`)).toBe(`sak ${PATIENT_GUID}`);
  });

  it('still masks when the opt-out is set against production', async () => {
    process.env.SEQ_REDACTION_ENABLED = 'false';
    process.env.SEQ_BASE_URL = 'https://seq.intern.webmed.no';
    expect(await redactText(`sak ${PATIENT_GUID}`)).toBe('sak [GUID_1]');
  });

  it('leaves a SHA digest and a short hex id intact (the shared module’s guard)', () => {
    const sha1 = 'a'.repeat(40);
    expect(stripGuids(`sha1 ${sha1}`)).toBe(`sha1 ${sha1}`);
    expect(stripGuids('0HNOEE1KFICN4:00001A6A')).toBe('0HNOEE1KFICN4:00001A6A');
  });
});
