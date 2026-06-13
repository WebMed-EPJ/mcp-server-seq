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
 *  - Person names — only those present in the curated Norwegian name
 *    dictionary below (the library's built-in NER is disabled; names outside
 *    the dictionary are NOT redacted). Names that are also common words are
 *    only masked when part of a multi-token name (see redactNorwegianNames)
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
 * Validate a candidate Norwegian national identity number.
 *
 * Accepts the identifier variants used in Norwegian healthcare:
 *  - fødselsnummer (ordinary 11-digit birth number)
 *  - D-number (temporary number; 40 added to the day → day 41–71)
 *  - H-number (help number; 40 added to the month → month 41–52)
 *  - FH-number (felles hjelpenummer; first digit 8 or 9, no date semantics)
 *
 * Validation checks the embedded date part where applicable and both MOD11
 * control digits, keeping false positives near zero so unrelated 11-digit
 * values (timestamps, IDs) are left intact.
 *
 * @param match - The matched string, optionally containing a single space
 *                after the 6-digit date part
 * @returns true if the value is a structurally valid Norwegian identity number
 */
function isValidNorwegianFnr(match: string): boolean {
  const digits = match.replace(/\s/g, '');
  if (!/^\d{11}$/.test(digits)) return false;

  const d = digits.split('').map(Number);

  // FH-numbers start with 8 or 9 and carry no date meaning — they are
  // validated by the MOD11 control digits alone. Other numbers have a date
  // part, allowing the D-number day offset (+40) and H-number month offset
  // (+40).
  if (d[0] < 8) {
    let day = d[0] * 10 + d[1];
    if (day > 40) day -= 40;
    let month = d[2] * 10 + d[3];
    if (month > 40) month -= 40;
    // Reject impossible calendar dates (e.g. 31-02). The century is unknown,
    // so 29 February is always allowed.
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day < 1 || month < 1 || month > 12 || day > daysInMonth[month - 1]) return false;
  }

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
 *
 * Trade-off: the bare-mobile branch (`\b[49]\d{7}\b`) will also match an
 * unrelated 8-digit value embedded in a string that happens to start with 4
 * or 9 (e.g. an order id `90000001`). This is a deliberate privacy-first
 * choice — leaking a real phone number is worse than masking an identifier
 * in a debug log. Set SEQ_REDACTION_ENABLED=false, or drop this branch, if
 * that over-redaction is unacceptable for a given deployment. (8-digit JSON
 * *numbers* are unaffected: redactDeep only scans 10/11-digit integers.)
 */
const NORWEGIAN_PHONE_PATTERN: PIIPattern = {
  type: 'PHONE_NO',
  // Separators are literal spaces (not \s) so a match never spans the
  // SEGMENT_DELIMITERS (tab/CR/LF) used by redactText — keeping that invariant
  // true. Norwegian numbers are grouped with spaces, not tabs/newlines. The
  // +47/0047 branch is fenced with digit lookarounds so it cannot match a
  // partial slice of a longer digit run (e.g. "+47 1234567890").
  regex: /(?<!\d)(?:\+47|0047) ?\d(?: ?\d){7}(?!\d)|\b\d{2} \d{2} \d{2} \d{2}\b|\b\d{3} \d{2} \d{3}\b|\b[49]\d{7}\b/g,
  priority: 80,
  validator: (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 8 || (digits.length === 10 && digits.startsWith('47'));
  },
  placeholder: '[PHONE_{n}]',
  description: 'Norwegian phone number',
  severity: 'high',
};

/**
 * Dictionary of common Norwegian first names and surnames (lower-cased), used
 * by {@link redactNorwegianNames}. The list is intentionally a curated
 * common-name set rather than exhaustive — extend it as needed for a given
 * deployment. Names NOT in this set are not redacted.
 */
const NORWEGIAN_NAMES: ReadonlySet<string> = new Set(
  [
    // Common first names
    'anne', 'inger', 'kari', 'marit', 'ingrid', 'liv', 'eva', 'berit', 'astrid',
    'bjørg', 'hilde', 'anna', 'solveig', 'randi', 'gerd', 'nina', 'marianne',
    'kristin', 'elisabeth', 'ida', 'maria', 'hanne', 'else', 'tone', 'ellen',
    'wenche', 'turid', 'sissel', 'grete', 'bente', 'heidi', 'camilla', 'silje',
    'julie', 'emma', 'sofie', 'nora', 'ingeborg', 'linda', 'monica', 'hege',
    'trine', 'mette', 'jan', 'per', 'bjørn', 'ole', 'ola', 'lars', 'kjell',
    'knut', 'svein', 'arne', 'hans', 'odd', 'tor', 'geir', 'tom', 'rolf',
    'morten', 'terje', 'thomas', 'martin', 'andreas', 'anders', 'magnus',
    'kristian', 'henrik', 'erik', 'espen', 'fredrik', 'jonas', 'marius',
    'daniel', 'håkon', 'jens', 'nils', 'petter', 'stian', 'trond', 'vidar',
    'øyvind', 'rune', 'sander', 'mathias', 'jakob', 'emil', 'oliver', 'filip',
    'noah', 'william', 'olav', 'sigurd', 'gunnar', 'harald', 'leif', 'egil',
    // Common surnames
    'hansen', 'johansen', 'olsen', 'larsen', 'andersen', 'pedersen', 'nilsen',
    'kristiansen', 'jensen', 'karlsen', 'johnsen', 'pettersen', 'eriksen',
    'berg', 'haugen', 'hagen', 'johannessen', 'andreassen', 'jacobsen', 'dahl',
    'jørgensen', 'halvorsen', 'lund', 'solberg', 'moen', 'eide', 'strand',
    'bakken', 'kristoffersen', 'mathisen', 'lie', 'iversen', 'rasmussen',
    'gundersen', 'holm', 'lunde', 'aas', 'moe', 'vik', 'antonsen', 'ellingsen',
    'nordmann',
  ],
);

/**
 * Subset of {@link NORWEGIAN_NAMES} whose entries are also high-frequency
 * ordinary words or technical tokens that routinely appear capitalized in logs
 * (e.g. "Else" in stack traces, "Per" in "Per request", "Tom" = empty, and
 * surname/noun collisions like "Berg", "Holm", "Strand"). To avoid corrupting
 * logs, these are redacted only when they appear as part of a multi-token name
 * (immediately adjacent to another dictionary name); standalone occurrences are
 * left intact. Unambiguous names are always redacted (see
 * {@link redactNorwegianNames}).
 */
const AMBIGUOUS_NAMES: ReadonlySet<string> = new Set([
  'else', 'per', 'tom', 'odd', 'tor', 'berg', 'strand', 'holm', 'lund', 'lie',
  'moe', 'vik', 'dahl', 'hagen',
]);

/** Matches a single capitalized word (Norwegian letters included). */
const NAME_TOKEN = /[A-ZÆØÅ][a-zæøåäöéèü]+/g;

/**
 * Deterministic short id for a name token, so the same name maps to the same
 * placeholder within (and across) responses.
 *
 * @param token - The matched name token
 * @returns A 4-digit string id
 */
function nameKey(token: string): string {
  let hash = 0;
  const lc = token.toLowerCase();
  for (let i = 0; i < lc.length; i++) hash = (hash * 31 + lc.charCodeAt(i)) >>> 0;
  return String(hash % 10000).padStart(4, '0');
}

/**
 * Redact Norwegian person names from text using the {@link NORWEGIAN_NAMES}
 * dictionary. The library's built-in NER is disabled (see {@link getDetector})
 * because it produced noisy false positives on Norwegian text; this is the sole
 * name-redaction step.
 *
 * Matching rules:
 *  - A capitalized word whose lower-case form is an unambiguous dictionary name
 *    is always redacted.
 *  - An {@link AMBIGUOUS_NAMES} word is redacted only when an immediately
 *    adjacent token (separated by a single space or hyphen) is also a
 *    dictionary name — i.e. it is part of a full name like "Per Berg" — so
 *    standalone common words such as "Else" or "Per second" are not masked.
 *  - Words are handled individually, so non-name neighbours (e.g. a
 *    sentence-initial "Pasient") are never swallowed, and each part of a
 *    hyphenated name ("Solberg-Haugen") is evaluated separately.
 *
 * IMPORTANT: names outside the dictionary are NOT redacted — coverage is
 * best-effort and bounded by the list.
 *
 * @param text - The text to scan
 * @returns The text with recognised names replaced by [NAME_nnnn]
 */
function redactNorwegianNames(text: string): string {
  const tokens: { value: string; start: number; end: number }[] = [];
  NAME_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NAME_TOKEN.exec(text)) !== null) {
    tokens.push({ value: match[0], start: match.index, end: match.index + match[0].length });
  }

  const isDictName = (value: string): boolean => NORWEGIAN_NAMES.has(value.toLowerCase());
  // True when `neighbour` is a dictionary name separated from `self` by only a
  // single space or hyphen (i.e. the two form one name).
  const adjacent = (
    self: { start: number; end: number },
    neighbour: { value: string; start: number; end: number } | undefined,
    side: 'before' | 'after',
  ): boolean => {
    if (!neighbour || !isDictName(neighbour.value)) return false;
    const gap = side === 'before'
      ? text.slice(neighbour.end, self.start)
      : text.slice(self.end, neighbour.start);
    return /^[ -]$/.test(gap);
  };

  const toRedact = new Set<number>();
  for (let i = 0; i < tokens.length; i++) {
    const lc = tokens[i].value.toLowerCase();
    if (!isDictName(lc)) continue;
    if (!AMBIGUOUS_NAMES.has(lc)) {
      toRedact.add(i);
    } else if (adjacent(tokens[i], tokens[i - 1], 'before') || adjacent(tokens[i], tokens[i + 1], 'after')) {
      toRedact.add(i);
    }
  }

  if (toRedact.size === 0) return text;

  let out = '';
  let cursor = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (!toRedact.has(i)) continue;
    out += text.slice(cursor, tokens[i].start) + `[NAME_${nameKey(tokens[i].value)}]`;
    cursor = tokens[i].end;
  }
  return out + text.slice(cursor);
}

let detector: OpenRedaction | null = null;

/**
 * Lazily construct the shared, local-only redaction engine.
 *
 * @returns A configured {@link OpenRedaction} detector instance
 */
function getDetector(): OpenRedaction {
  if (!detector) {
    detector = new OpenRedaction({
      // Whitelist only the built-in EMAIL pattern. The library's broader
      // built-in detection (NER names, social handles, UK/US phones) produced
      // noisy false positives on Norwegian log text — e.g. mangling ordinary
      // words into [IG_USER_n] and flagging "Gateway" as a name — and its
      // UK/US phone patterns over-match long digit runs. Identity and phone
      // numbers are handled by the Norwegian-tuned custom patterns; person
      // names are handled separately by redactNorwegianNames.
      patterns: ['EMAIL'],
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
 * Delimiters that personal data never spans (semicolons, pipes, and
 * whitespace line breaks/tabs). Used to segment text before detection — see
 * {@link redactText}. The capturing group preserves the delimiters on split.
 */
const SEGMENT_DELIMITERS = /([;|\r\n\t]+)/;

/**
 * Redact personal data from a single string.
 *
 * Workaround for an openredaction limitation (upstream issue #26): the
 * library's English-centric context-analysis confidence model can silently
 * drop *all* detections in a segment when it contains certain delimiters —
 * notably a semicolon — which is common in log messages, stack traces and
 * connection strings. To contain this, the text is split on delimiters that
 * no supported PII type (fødselsnummer, phone, name, email) ever spans, each
 * segment is redacted independently, and the original delimiters are restored
 * exactly. This isolates a poisoned segment so it cannot suppress detection in
 * the rest of the string.
 *
 * @param text - The text to scan and redact
 * @returns The redacted text (unchanged if redaction is disabled or empty)
 */
export async function redactText(text: string): Promise<string> {
  if (!isRedactionEnabled() || !text) return text;

  const parts = text.split(SEGMENT_DELIMITERS);
  const detector = getDetector();
  // Segments are processed sequentially (not via Promise.all) because the
  // detector is a shared singleton: concurrent in-flight detect() calls could
  // interleave any mutable internal state. Segment counts are small, so the
  // cost is negligible.
  const out: string[] = [];
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    // Odd indices are the captured delimiters — preserve them verbatim.
    if (index % 2 === 1 || part === '') {
      out.push(part);
    } else {
      // Library handles email/fnr/phone; names are redacted by our own
      // dictionary pass afterwards (placeholders contain no segment delimiters,
      // so the name pass is unaffected by segmentation).
      const detected = (await detector.detect(part)).redacted;
      out.push(redactNorwegianNames(detected));
    }
  }
  return out.join('');
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
    // Sequential (not Promise.all) so redactText's detect() calls never run
    // concurrently against the shared singleton detector — see redactText.
    const arr: unknown[] = [];
    for (const item of value) arr.push(await redactDeep(item));
    return arr as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = await redactDeep(val);
    }
    return out as unknown as T;
  }

  // A fødselsnummer may arrive as a numeric value. Stored as a number it
  // loses leading zeros, so a person born on days 01–09 yields 10 digits;
  // pad such values back to 11 before checking. (Numbers are inherently lossy
  // for identity numbers — prefer logging them as strings.)
  if (typeof value === 'number' && Number.isInteger(value)) {
    const raw = String(Math.abs(value));
    const candidate = raw.length === 11 ? raw : raw.length === 10 ? `0${raw}` : null;
    if (candidate) {
      const redacted = await redactText(candidate);
      if (redacted !== candidate) return redacted as unknown as T;
    }
    return value;
  }

  return value;
}
