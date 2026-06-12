import { OpenRedaction, type PIIPattern } from 'openredaction';

/**
 * Local, privacy-preserving redaction of personal data in log payloads
 * returned from Seq.
 *
 * Built on the `openredaction` library, configured to run **entirely
 * locally**: no audit backend, metrics exporter, webhook, or RBAC manager
 * is enabled, so no log content ever leaves this process. This matters for
 * GDPR/Personvern when the underlying logs may contain patient data from a
 * Norwegian EPJ (journalsystem).
 *
 * What gets masked:
 *  - Norwegian national identity numbers (fødselsnummer) and D-numbers
 *    (custom pattern below, validated with date + MOD11 checks)
 *  - Norwegian phone numbers, including the +47/0047 country-code and
 *    space-grouped formats the library does not catch out of the box
 *    (custom pattern below)
 *  - Person names (library NER)
 *  - Email addresses (library built-in; reserved example/test domains such
 *    as example.com are intentionally treated as non-PII)
 */

/**
 * Whether redaction is active. Enabled by default; set
 * `SEQ_REDACTION_ENABLED=false` to opt out (e.g. for debugging against a
 * non-production Seq instance with no real personal data).
 *
 * @returns true when log payloads should be redacted before returning them
 */
function isRedactionEnabled(): boolean {
  return (process.env.SEQ_REDACTION_ENABLED ?? 'true').toLowerCase() !== 'false';
}

/**
 * Validate a candidate Norwegian fødselsnummer / D-number.
 *
 * Checks the embedded date part (accepting D-numbers, where 40 is added to
 * the day) and both MOD11 control digits. This keeps false positives near
 * zero so unrelated 11-digit values (timestamps, IDs) are left intact.
 *
 * @param match - The matched string, optionally containing a single space
 *                after the 6-digit date part
 * @returns true if the value is a structurally valid fødselsnummer/D-number
 */
function isValidNorwegianFnr(match: string): boolean {
  const digits = match.replace(/\s/g, '');
  if (!/^\d{11}$/.test(digits)) return false;

  const d = digits.split('').map(Number);

  // Day part allows D-numbers (day + 40 → 41–71).
  let day = d[0] * 10 + d[1];
  if (day > 40) day -= 40;
  const month = d[2] * 10 + d[3];
  if (day < 1 || day > 31 || month < 1 || month > 12) return false;

  // MOD11 control digit 1 (position 10).
  const w1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  let sum1 = 0;
  for (let i = 0; i < 9; i++) sum1 += d[i] * w1[i];
  let k1 = 11 - (sum1 % 11);
  if (k1 === 11) k1 = 0;
  if (k1 === 10 || k1 !== d[9]) return false;

  // MOD11 control digit 2 (position 11).
  const w2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 10; i++) sum2 += d[i] * w2[i];
  let k2 = 11 - (sum2 % 11);
  if (k2 === 11) k2 = 0;
  if (k2 === 10 || k2 !== d[10]) return false;

  return true;
}

/**
 * Custom PII pattern for Norwegian national identity numbers and D-numbers.
 * Matches 11 digits, optionally with a single space after the date part,
 * and confirms validity via {@link isValidNorwegianFnr}.
 */
const NORWEGIAN_FNR_PATTERN: PIIPattern = {
  type: 'NO_FNR',
  regex: /\b\d{6}\s?\d{5}\b/g,
  priority: 100,
  validator: (value: string) => isValidNorwegianFnr(value),
  placeholder: '[FNR_{n}]',
  description: 'Norwegian national identity number (fødselsnummer) or D-number',
  severity: 'critical',
};

/**
 * Custom PII pattern for Norwegian phone numbers. The library's built-in
 * phone patterns are UK/US-centric and greedily match long digit runs (e.g.
 * an 11-digit timestamp as a "UK number"), which would corrupt numeric log
 * fields, so they are disabled in favour of this Norwegian-tuned pattern.
 *
 * Covered formats:
 *  - +47 / 0047 country-code form, with optional spacing between the 8 digits
 *  - space-grouped local formats ("22 33 44 55", "412 34 567")
 *  - bare 8-digit numbers starting with a Norwegian mobile prefix (4 or 9)
 *
 * Bare 8-digit numbers starting with other digits are treated as ambiguous
 * identifiers (status codes, durations, IDs, …) and left intact to keep logs
 * useful. The validator confirms exactly 8 subscriber digits (optionally
 * preceded by the "47" country code) so a fragment of a longer number is
 * never redacted.
 */
const NORWEGIAN_PHONE_PATTERN: PIIPattern = {
  type: 'PHONE_NO',
  regex: /(?:\+47|0047)\s?\d(?:\s?\d){7}|\b\d{2}\s\d{2}\s\d{2}\s\d{2}\b|\b\d{3}\s\d{2}\s\d{3}\b|\b[49]\d{7}\b/g,
  priority: 80,
  validator: (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 8 || (digits.length === 10 && digits.startsWith('47'));
  },
  placeholder: '[PHONE_{n}]',
  description: 'Norwegian phone number',
  severity: 'high',
};

let detector: OpenRedaction | null = null;

/**
 * Lazily construct the shared, local-only redaction engine.
 *
 * @returns A configured {@link OpenRedaction} detector instance
 */
function getDetector(): OpenRedaction {
  if (!detector) {
    detector = new OpenRedaction({
      includeNames: true,
      includeEmails: true,
      includePhones: false, // UK/US built-ins over-match digit runs; see NORWEGIAN_PHONE_PATTERN
      includeAddresses: false,
      customPatterns: [NORWEGIAN_FNR_PATTERN, NORWEGIAN_PHONE_PATTERN],
      redactionMode: 'placeholder',
      // Audit logging, metrics, webhooks and RBAC are intentionally left at
      // their defaults (all off) so redaction stays fully in-process — no
      // log data is sent anywhere.
    });
  }
  return detector;
}

/**
 * Redact personal data from a single string.
 *
 * @param text - The text to scan and redact
 * @returns The redacted text (unchanged if redaction is disabled or empty)
 */
export async function redactText(text: string): Promise<string> {
  if (!isRedactionEnabled() || !text) return text;
  const result = await getDetector().detect(text);
  return result.redacted;
}

/**
 * Recursively redact personal data from any JSON-serialisable value
 * (objects, arrays, strings). Structure and non-string values are preserved;
 * 11-digit integers are also checked so a fødselsnummer stored as a number
 * is still masked.
 *
 * @param value - The value to redact
 * @returns A new value with personal data masked
 */
export async function redactDeep<T>(value: T): Promise<T> {
  if (!isRedactionEnabled()) return value;

  if (typeof value === 'string') {
    return (await redactText(value)) as unknown as T;
  }

  if (Array.isArray(value)) {
    return (await Promise.all(value.map((item) => redactDeep(item)))) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = await redactDeep(val);
    }
    return out as unknown as T;
  }

  // A fødselsnummer may arrive as a numeric value; scan 11-digit integers.
  if (typeof value === 'number' && Number.isInteger(value) && String(Math.abs(value)).length === 11) {
    const asString = String(value);
    const redacted = await redactText(asString);
    return (redacted === asString ? value : redacted) as unknown as T;
  }

  return value;
}
