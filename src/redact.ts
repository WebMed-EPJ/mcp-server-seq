import { createHash, randomBytes } from 'node:crypto';
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
 *  - Pseudonymous patient identifiers (`PatientId` and friends) — masked by
 *    the PROPERTY NAME they are logged under, not by the shape of the value,
 *    because they are GUIDs and indistinguishable from the correlation and
 *    request ids that must stay readable. See
 *    DEFAULT_PSEUDONYM_ID_PROPERTIES and redactDeep
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
    // Strip the international "00" so the 0047 form normalises to the 47 form.
    const normalized = digits.startsWith('0047') ? digits.slice(2) : digits;
    return normalized.length === 8 || (normalized.length === 10 && normalized.startsWith('47'));
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

/**
 * Property names whose values are treated as pseudonymous identifiers for a
 * data subject and are therefore masked wholesale, regardless of the value's
 * form. Compared lower-cased.
 *
 * These identifiers are GUIDs in WebMed's logs (`PatientId` is a canonical
 * 36-character GUID string), and a GUID cannot be recognised by its VALUE:
 * correlation ids, request ids, tenant ids and signal ids look exactly the
 * same, and masking every GUID in a log response would make the logs useless
 * for debugging. So the identifier is recognised by the NAME it is logged
 * under — see {@link PSEUDONYM_NAMED_VALUE_KEYS} and
 * {@link namedIdentifierPattern} for the places a name can appear.
 *
 * A pseudonymous identifier is still personal data under GDPR/Personvern
 * (recital 26): it singles out one patient, and anyone with access to the EPJ
 * database can re-identify them. Masking it means the identifier is never
 * transferred out of this process, while the deterministic placeholder keeps a
 * debugging session able to see that two events concern the same patient.
 *
 * Deliberately NOT included by default: `UserId`, `DoctorId` and
 * `PractitionerId`. Those identify WebMed staff rather than the data subject,
 * they are load-bearing for everyday debugging, and `DoctorId` is frequently a
 * small integer whose masking would be far more destructive (see
 * {@link isDistinctiveIdValue}). Add them per deployment via
 * `SEQ_PSEUDONYM_ID_PROPERTIES` if a given installation needs them.
 */
const DEFAULT_PSEUDONYM_ID_PROPERTIES: readonly string[] = [
  'patientid',
  'patientguid',
  'patientkey',
  'patientuid',
  // Norwegian spellings, in case a service logs them that way.
  'pasientid',
  'pasientguid',
];

/**
 * Sibling keys naming, and holding the value of, a name/value pair. Seq's
 * `/api/events` returns event properties as `{ Name, Value }` objects and
 * message-template tokens as `{ PropertyName, FormattedValue, … }`, so the
 * identifier's name is not the object key it is stored under — it is the
 * *value* of a `Name` / `PropertyName` member. Both shapes are handled (as well
 * as the plain `{ PatientId: … }` object form), because a payload shape that
 * slips through would silently ship the identifier.
 */
const PSEUDONYM_NAME_KEYS: readonly string[] = ['name', 'propertyname'];
const PSEUDONYM_NAMED_VALUE_KEYS: readonly string[] = ['value', 'formattedvalue'];

/** Canonical GUID form, with or without wrapping braces. */
const GUID_SHAPE = /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i;

/**
 * Longest identifier value we will hash and search for in free text. A value
 * longer than this is not an identifier, and building a regex from it would be
 * a needless cost on every string in the response.
 */
const MAX_ID_VALUE_LENGTH = 256;

/**
 * Most identifier values the free-text sweep (pass C) will search for in one
 * response.
 *
 * The sweep compiles the collected values into an alternation, and the number
 * of values is otherwise unbounded: `select PatientId, count(*) … group by
 * PatientId` returns one distinct identifier PER ROW, so a large rowset makes a
 * large pattern. Measured on V8, matching stays cheap (the alternation is
 * dispatched, not backtracked) but COMPILATION is synchronous and grows
 * linearly — ~4 ms at 1 000 values, ~550 ms at 100 000, ~2.3 s at 300 000. On
 * the hosted server that is an event-loop stall for every other user, so the
 * count is capped.
 *
 * Capping costs nothing where it binds: the responses that collect thousands of
 * identifiers are rowsets, whose identifiers are masked by the STRUCTURAL pass
 * (their column is masked cell by cell) and which carry no free text for the
 * sweep to clean. A value past the cap is therefore still masked where it
 * appears — under its property name, and next to it in text — it is only not
 * searched for elsewhere. 1 000 distinct identifiers in one response's prose is
 * far beyond any real investigation.
 */
const MAX_SWEEP_VALUES = 1000;

let idPropertiesCache: { raw: string; names: ReadonlySet<string> } | null = null;

/**
 * The active set of pseudonymous-identifier property names (lower-cased).
 *
 * `SEQ_PSEUDONYM_ID_PROPERTIES` (comma/whitespace separated) EXTENDS the
 * defaults; it cannot shrink them. Same rule as the other privacy lists in
 * WebMed's connectors: an operator may widen masking for a deployment, but a
 * misconfigured env var must never be able to switch off masking of the patient
 * identifier. (Redaction as a whole is still opt-out via
 * `SEQ_REDACTION_ENABLED=false`, which is an explicit, documented choice.)
 *
 * Memoised on the raw env value so a change is picked up without a restart —
 * and, more practically, so tests can set it per case.
 *
 * @returns Lower-cased property names whose values are pseudonymous identifiers
 */
function pseudonymIdProperties(): ReadonlySet<string> {
  const raw = process.env.SEQ_PSEUDONYM_ID_PROPERTIES ?? '';
  if (idPropertiesCache && idPropertiesCache.raw === raw) return idPropertiesCache.names;
  const names = new Set(DEFAULT_PSEUDONYM_ID_PROPERTIES);
  for (const extra of raw.split(/[,\s]+/)) {
    const trimmed = extra.trim().toLowerCase();
    if (trimmed) names.add(trimmed);
  }
  idPropertiesCache = { raw, names };
  return names;
}

let saltCache: { raw: string | undefined; salt: string } | null = null;

/**
 * Salt mixed into every identifier digest.
 *
 * Default is a random per-process value. That matters: an UNSALTED digest of a
 * patient GUID is itself a stable pseudonym derived from the identifier, so
 * anyone holding a candidate GUID could hash it and confirm that the patient
 * appears in an exported log excerpt. A per-process salt keeps the placeholder
 * correlatable where it needs to be — within a response, and for the lifetime
 * of the process — while making that offline confirmation impossible.
 *
 * Set `SEQ_PSEUDONYM_SALT` to a fixed secret to trade that away for stability
 * across restarts and across replicas of the hosted server (useful when one
 * investigation spans several tool calls that may be served by different
 * replicas). Treat such a value as a secret: it is what makes the digests
 * unverifiable.
 *
 * @returns The salt string in use
 */
function pseudonymSalt(): string {
  const raw = process.env.SEQ_PSEUDONYM_SALT;
  if (saltCache && saltCache.raw === raw) return saltCache.salt;
  const salt = raw && raw.length > 0 ? raw : randomBytes(32).toString('hex');
  saltCache = { raw, salt };
  return salt;
}

/**
 * Normalise an identifier before hashing so the same identifier written
 * differently still maps to the same placeholder. Only GUIDs are normalised
 * (case and wrapping braces are not significant in a GUID); every other value
 * is hashed verbatim, since for an opaque identifier a case difference may be
 * a real difference.
 *
 * @param value - The raw identifier value
 * @returns The string to hash
 */
function pseudonymKey(value: string): string {
  return GUID_SHAPE.test(value) ? value.replace(/[{}]/g, '').toLowerCase() : value;
}

/**
 * Deterministic placeholder for a pseudonymous identifier: the same value
 * always yields the same placeholder within a response (and within the life of
 * the process — see {@link pseudonymSalt}), so a reader can still tell that two
 * log events concern the same patient without the identifier being transferred.
 *
 * The digest is 8 hex characters (~4.3 billion buckets), which keeps the
 * placeholder short enough to read in a log while making a collision between
 * two patients in one investigation negligible. The `_` before the digest is
 * load-bearing: it makes the digits a continuation of a word, so the phone and
 * fødselsnummer patterns (both anchored on `\b`) can never match inside a
 * placeholder we just inserted.
 *
 * @param value - The identifier value to mask
 * @returns A placeholder of the form `[PSEUDONYM_a1b2c3d4]`
 */
export function pseudonymPlaceholder(value: string): string {
  const digest = createHash('sha256')
    .update(pseudonymSalt())
    // A NUL byte separates salt from value: neither a configured salt nor a Seq
    // property value contains one, so the boundary cannot be shifted to make
    // two different (salt, value) pairs hash alike. Written as an escape — a
    // literal control character has no place in source.
    .update('\u0000')
    .update(pseudonymKey(value))
    .digest('hex')
    .slice(0, 8);
  return `[PSEUDONYM_${digest}]`;
}

/**
 * Mask any value found under a pseudonymous-identifier property name.
 *
 * Fail-closed: anything that is not null/undefined is masked, including a
 * number (an integer identifier), a boolean, or — unexpected but possible — a
 * whole object or array, which is masked as one placeholder over its JSON form
 * rather than recursed into. A property called `PatientId` must not ship its
 * contents just because it turned out not to be a plain string.
 *
 * @param value - The value stored under the identifier property
 * @returns The placeholder, or the value unchanged when it is null/undefined
 */
function maskIdentifierValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value === '' ? value : pseudonymPlaceholder(value);
  if (typeof value === 'object') return pseudonymPlaceholder(identifierObjectText(value));
  return pseudonymPlaceholder(String(value));
}

/**
 * Serialise a non-scalar value found under an identifier property, for hashing.
 *
 * `JSON.stringify` THROWS on a circular structure or a nested `BigInt`. Seq's
 * own payloads arrive from `response.json()` and can be neither, but this runs
 * on the redaction path, so a throw here would abort redaction for an otherwise
 * maskable payload — the one failure mode a privacy filter must not have. The
 * fallback is fail-closed: the value is still masked, with a fixed marker in
 * place of its text, so an unserialisable shape yields a placeholder rather
 * than an exception (and never the value itself).
 *
 * @param value - The object or array stored under the identifier property
 * @returns Its JSON form, or a fixed marker when it cannot be serialised
 */
function identifierObjectText(value: object): string {
  try {
    return JSON.stringify(value) ?? UNSERIALISABLE_IDENTIFIER;
  } catch {
    return UNSERIALISABLE_IDENTIFIER;
  }
}

/** Hashed in place of a value that cannot be JSON-serialised. */
const UNSERIALISABLE_IDENTIFIER = '\u0000unserialisable-identifier';

/**
 * Whether an identifier value is distinctive enough to be searched for — and
 * replaced — everywhere else in the same response (pass C in
 * {@link redactDeep}).
 *
 * A GUID, or a long identifier-shaped token, cannot plausibly collide with
 * unrelated log text. A short or purely numeric one can: an integer patient id
 * such as `4711` also occurs as a duration, a status count or a port, and
 * blanket-replacing it would corrupt the very logs the tool exists to explain.
 * Such values are still masked where they appear under their property name
 * (pass A) or next to it (pass B) — the free-text sweep is simply not safe for
 * them. This limitation is documented in the README.
 *
 * @param value - A collected identifier value
 * @returns true when the value may be replaced in arbitrary free text
 */
function isDistinctiveIdValue(value: string): boolean {
  if (value.length > MAX_ID_VALUE_LENGTH) return false;
  if (GUID_SHAPE.test(value)) return true;
  return value.length >= 12 && /\d/.test(value) && !/\s/.test(value);
}

/**
 * Escape a literal string for use inside a regular expression.
 *
 * @param value - The literal to escape
 * @returns The escaped literal
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let namedPatternCache: { key: string; pattern: RegExp } | null = null;

/**
 * Pattern for an identifier that names itself in free text — `PatientId =
 * '3fa8…'` in an echoed Seq filter, `PatientId: 3fa8…` in a rendered message,
 * `PatientId 3fa8…` in a log line. This is the text-level half of the
 * name-based rule: it needs no prior knowledge of the value, so it also covers
 * strings that never passed through the structural walk — notably a Seq error
 * body, which is redacted via {@link redactText} alone.
 *
 * The value is taken either from quotes (explicit intent — anything inside is
 * masked) or as a bare token, which must contain a digit; that requirement is
 * what stops `PatientId ukjent` from masking the word "ukjent". Every
 * quantifier is bounded, so the pattern cannot backtrack super-linearly on
 * hostile log text.
 *
 * @returns A global, case-insensitive regex, rebuilt only when the name set
 *          changes
 */
function namedIdentifierPattern(): RegExp {
  const names = [...pseudonymIdProperties()].sort();
  const key = names.join(',');
  if (namedPatternCache && namedPatternCache.key === key) {
    namedPatternCache.pattern.lastIndex = 0;
    return namedPatternCache.pattern;
  }
  const alternation = names.map(escapeRegExp).join('|');
  const pattern = new RegExp(
    // The property name, not itself part of a longer word …
    `(?<![0-9A-Za-z_])(?:${alternation})(?![0-9A-Za-z_])`
    // … an optional closing quote, so a raw JSON body (`"PatientId":"3fa8…"`,
    // which is how a Seq error echoes a filter) is covered as well as a
    // rendered log line …
    + `['"]{0,1}`
    // … then an operator (optionally spaced) or at least one space …
    + `(?:[ \\t]{0,8}[:=]{1,2}[ \\t]{0,8}|[ \\t]{1,8})`
    // … then 'quoted' | "quoted" | a bare identifier-ish token.
    + `(?:'([^'\\r\\n]{1,128})'|"([^"\\r\\n]{1,128})"|([0-9A-Za-z][0-9A-Za-z._:-]{2,127}))`,
    'gi',
  );
  namedPatternCache = { key, pattern };
  return pattern;
}

/**
 * True when a bare (unquoted) token following an identifier name looks like an
 * identifier rather than an ordinary word. Requiring a digit keeps Norwegian
 * log prose intact ("PatientId mangler", "PatientId er ukjent").
 *
 * @param token - The bare token that followed the property name
 * @returns true when the token should be treated as an identifier value
 */
function isBareIdentifierToken(token: string): boolean {
  return /\d/.test(token);
}

/**
 * The identifier value captured by {@link namedIdentifierPattern}, or undefined
 * when the match was a property name followed by ordinary prose.
 *
 * @param single - Contents of a single-quoted value, if that alternative matched
 * @param double - Contents of a double-quoted value, if that alternative matched
 * @param bare - The bare token, if that alternative matched
 * @returns The identifier value, or undefined
 */
function namedIdentifierValue(
  single?: string,
  double?: string,
  bare?: string,
): string | undefined {
  const quoted = single ?? double;
  if (quoted !== undefined) return quoted;
  if (bare !== undefined && isBareIdentifierToken(bare)) return bare;
  return undefined;
}

/**
 * Replace `<identifier name><separator><value>` occurrences in a string with
 * the value's placeholder, keeping the name itself (which is schema, not
 * personal data, and is what makes the redacted line readable).
 *
 * @param text - The text to scan
 * @returns The text with named identifier values masked
 */
function redactNamedIdentifiers(text: string): string {
  return text.replace(
    namedIdentifierPattern(),
    (match: string, single?: string, double?: string, bare?: string) => {
      const value = namedIdentifierValue(single, double, bare);
      if (value === undefined) return match;
      // The value is the tail of the match (possibly followed by one closing
      // quote), so splice at its LAST position. A plain `replace(value, …)`
      // would hit an earlier coincidental occurrence — the value `tId` in
      // `PatientId = 'tId'` also occurs inside the property name itself.
      const at = match.lastIndexOf(value);
      return match.slice(0, at) + pseudonymPlaceholder(value) + match.slice(at + value.length);
    },
  );
}

/**
 * The identifier values collected from one response, compiled into alternations
 * so every string in the payload costs a fixed number of regex passes rather
 * than one pass per identifier.
 *
 * There are two patterns rather than one because case significance differs by
 * value shape, and pass C must agree with {@link pseudonymKey} on that: a GUID
 * is the same identifier in any casing, while for any other opaque identifier a
 * case difference may be a real difference. Matching everything
 * case-insensitively against one lower-cased lookup would collapse two
 * genuinely distinct non-GUID identifiers that differ only by case into one
 * placeholder — exactly the false "same patient" the determinism guarantee
 * exists to prevent.
 */
interface CollectedIdentifiers {
  /** GUID-shaped values, matched case-insensitively. Null when there are none. */
  guidPattern: RegExp | null;
  /** Every other value, matched case-sensitively. Null when there are none. */
  exactPattern: RegExp | null;
  /** {@link pseudonymKey} of the value → placeholder. */
  placeholders: ReadonlyMap<string, string>;
}

/**
 * Compile the distinctive identifier values of a response for the free-text
 * sweep (pass C — see {@link redactDeep}).
 *
 * Longest first within each pattern, so an identifier that contains a shorter
 * one is masked as a whole rather than hollowed out from the inside, and capped
 * at {@link MAX_SWEEP_VALUES}. Both patterns are fenced by alphanumeric
 * lookarounds so a value is never cut out of the middle of a longer token.
 *
 * @param values - Raw identifier values collected from the response
 * @returns The compiled patterns and their shared placeholder lookup
 */
function compileCollectedIdentifiers(values: Iterable<string>): CollectedIdentifiers {
  const distinctive = [...values]
    .filter(isDistinctiveIdValue)
    .sort((a, b) => b.length - a.length)
    // Bounded so a large rowset cannot turn pass C into an event-loop stall —
    // see MAX_SWEEP_VALUES for why dropping the tail is safe.
    .slice(0, MAX_SWEEP_VALUES);

  const placeholders = new Map<string, string>();
  for (const value of distinctive) {
    placeholders.set(pseudonymKey(value), pseudonymPlaceholder(value));
  }

  const guids = distinctive.filter((value) => GUID_SHAPE.test(value));
  const others = distinctive.filter((value) => !GUID_SHAPE.test(value));
  return {
    guidPattern: collectedValuePattern(guids, 'gi'),
    exactPattern: collectedValuePattern(others, 'g'),
    placeholders,
  };
}

/**
 * Build one fenced alternation over a set of collected identifier values.
 *
 * @param values - The values to match, longest first
 * @param flags - Regex flags, deciding this pattern's case sensitivity
 * @returns The pattern, or null when there are no values
 */
function collectedValuePattern(values: readonly string[], flags: string): RegExp | null {
  if (values.length === 0) return null;
  return new RegExp(
    `(?<![0-9A-Za-z])(?:${values.map(escapeRegExp).join('|')})(?![0-9A-Za-z])`,
    flags,
  );
}

/**
 * Replace known identifier values anywhere in a string, so an identifier that
 * appears in a rendered message WITHOUT naming its property ("Hentet journal
 * for 3fa85f64-…") is masked with the same placeholder as the structured field
 * it came from.
 *
 * Both passes resolve the placeholder through {@link pseudonymKey}, the same
 * normalisation the digest uses, so a case-insensitive GUID match and a
 * case-sensitive match of anything else land on the identical placeholder the
 * structural pass wrote.
 *
 * @param text - The text to scan
 * @param ids - The compiled identifiers of the response
 * @returns The text with those values masked
 */
function redactCollectedIdentifiers(text: string, ids: CollectedIdentifiers): string {
  if (!text) return text;
  let out = text;
  for (const pattern of [ids.guidPattern, ids.exactPattern]) {
    if (!pattern) continue;
    pattern.lastIndex = 0;
    out = out.replace(pattern, (match) => ids.placeholders.get(pseudonymKey(match)) ?? match);
  }
  return out;
}

/**
 * Column indexes of a Seq `sql_query` rowset that hold a pseudonymous
 * identifier.
 *
 * `/api/data` returns `{ Columns: ["PatientId", "n"], Rows: [["3fa8…", 5]] }`:
 * the name lives in a *sibling array*, so neither the object-key rule nor the
 * name/value-pair rule sees it, and `select PatientId, count(*) … group by
 * PatientId` would otherwise return a plain list of patient identifiers.
 * Headers are matched on a contained word so a wrapped expression
 * (`distinct(PatientId)`) is caught too.
 *
 * @param value - A candidate object from the response
 * @returns The masked column indexes, or null when this is not a rowset
 */
function pseudonymColumnIndexes(value: Record<string, unknown>): ReadonlySet<number> | null {
  const columns = value.Columns;
  if (!Array.isArray(columns) || !Array.isArray(value.Rows)) return null;
  const pattern = columnHeaderPattern();
  const indexes = new Set<number>();
  columns.forEach((column, index) => {
    if (typeof column !== 'string') return;
    if (pattern.test(column.toLowerCase())) indexes.add(index);
  });
  return indexes.size > 0 ? indexes : null;
}

let columnPatternCache: { key: string; pattern: RegExp } | null = null;

/**
 * One alternation over the identifier property names, for testing a rowset's
 * column headers.
 *
 * Cached per name set rather than rebuilt per column: `redactDeep` runs
 * {@link pseudonymColumnIndexes} on every object in BOTH the collection and the
 * redaction walk, so a per-column-per-name construction here is paid columns ×
 * names × 2 for every rowset.
 *
 * Deliberately NOT global: `RegExp.test` on a `g` pattern advances `lastIndex`,
 * so a cached global pattern would give a different answer on the same header
 * depending on what was tested before it.
 *
 * @returns A non-global, rebuilt-only-when-the-name-set-changes regex
 */
function columnHeaderPattern(): RegExp {
  const names = [...pseudonymIdProperties()].sort();
  const key = names.join(',');
  if (columnPatternCache && columnPatternCache.key === key) return columnPatternCache.pattern;
  const pattern = new RegExp(
    `(?<![0-9a-z_])(?:${names.map(escapeRegExp).join('|')})(?![0-9a-z_])`,
  );
  columnPatternCache = { key, pattern };
  return pattern;
}

/**
 * Whether this object is a name/value pair for a pseudonymous-identifier
 * property (Seq's `{ Name, Value }` / `{ PropertyName, FormattedValue }`
 * shapes).
 *
 * @param value - A candidate object from the response
 * @returns true when the object's value members hold an identifier
 */
function isNamedIdentifierPair(value: Record<string, unknown>): boolean {
  const names = pseudonymIdProperties();
  for (const [key, member] of Object.entries(value)) {
    if (!PSEUDONYM_NAME_KEYS.includes(key.toLowerCase())) continue;
    if (typeof member === 'string' && names.has(member.trim().toLowerCase())) return true;
  }
  return false;
}

/**
 * Collect the scalar cell values of the identifier columns of a rowset.
 *
 * @param rows - The `Rows` member of a Seq rowset
 * @param columnIndexes - Indexes of the identifier columns
 * @param out - Set collecting the raw identifier values found
 */
function collectRowIdentifiers(
  rows: readonly unknown[],
  columnIndexes: ReadonlySet<number>,
  out: Set<string>,
): void {
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    row.forEach((cell, index) => {
      if (!columnIndexes.has(index)) return;
      if (typeof cell === 'string') out.add(cell);
      else if (typeof cell === 'number' || typeof cell === 'bigint') out.add(String(cell));
    });
  }
}

/**
 * Walk a response and collect every pseudonymous-identifier value in it, from
 * all four shapes (object key, name/value pair, rowset column, and a string
 * that names the property inline). The collected values are what pass C —
 * {@link redactCollectedIdentifiers} — sweeps out of free text, so an
 * identifier is masked identically wherever it appears in the response, not
 * only where it was recognisable.
 *
 * @param value - The value to walk
 * @param out - Set collecting the raw identifier values found
 */
function collectPseudonymValues(value: unknown, out: Set<string>): void {
  if (typeof value === 'string') {
    const pattern = namedIdentifierPattern();
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value)) !== null) {
      const found = namedIdentifierValue(match[1], match[2], match[3]);
      if (found) out.add(found);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectPseudonymValues(item, out);
    return;
  }

  if (value === null || typeof value !== 'object') return;

  const record = value as Record<string, unknown>;
  const names = pseudonymIdProperties();
  const columnIndexes = pseudonymColumnIndexes(record);
  const namedPair = isNamedIdentifierPair(record);

  for (const [key, member] of Object.entries(record)) {
    const lowerKey = key.toLowerCase();
    if (names.has(lowerKey) || (namedPair && PSEUDONYM_NAMED_VALUE_KEYS.includes(lowerKey))) {
      if (typeof member === 'string') out.add(member);
      else if (typeof member === 'number' || typeof member === 'bigint') out.add(String(member));
      continue;
    }
    if (columnIndexes && key === 'Rows' && Array.isArray(member)) {
      collectRowIdentifiers(member, columnIndexes, out);
      continue;
    }
    collectPseudonymValues(member, out);
  }
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
 * Pseudonymous identifiers that name their own property inline (`PatientId =
 * '3fa8…'`) are masked FIRST, on the whole string, so this path — which is also
 * the one a Seq error body takes, with no surrounding structure to inspect —
 * masks them too. The placeholders it inserts cannot be re-matched by the
 * patterns that run afterwards (see {@link pseudonymPlaceholder}).
 *
 * @param text - The text to scan and redact
 * @returns The redacted text (unchanged if redaction is disabled or empty)
 */
export async function redactText(text: string): Promise<string> {
  if (!isRedactionEnabled() || !text) return text;

  const parts = redactNamedIdentifiers(text).split(SEGMENT_DELIMITERS);
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
 * Redact the identifier columns of a Seq rowset, cell by cell.
 *
 * @param rows - The `Rows` member of a Seq rowset
 * @param columnIndexes - Indexes of the identifier columns
 * @param ids - The compiled identifiers of the response
 * @returns A new rows array with identifier cells masked
 */
async function redactRows(
  rows: readonly unknown[],
  columnIndexes: ReadonlySet<number>,
  ids: CollectedIdentifiers,
): Promise<unknown[]> {
  const out: unknown[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) {
      out.push(await redactValue(row, ids));
      continue;
    }
    const cells: unknown[] = [];
    for (let index = 0; index < row.length; index++) {
      cells.push(
        columnIndexes.has(index)
          ? maskIdentifierValue(row[index])
          : await redactValue(row[index], ids),
      );
    }
    out.push(cells);
  }
  return out;
}

/**
 * The recursive worker behind {@link redactDeep}. Split out from the public
 * entry point so the identifier collection pass runs exactly once, over the
 * whole response, before any masking begins — the collected values are then
 * available to every string in the payload, whatever order it is walked in.
 *
 * @param value - The value to redact
 * @param ids - The compiled identifiers of the response
 * @returns A new value with personal data masked
 */
async function redactValue(value: unknown, ids: CollectedIdentifiers): Promise<unknown> {
  if (typeof value === 'string') {
    // Known identifier values first (pass C), then the pattern-based passes:
    // the placeholder is inert to those patterns, whereas the reverse order
    // would let a redaction of the surrounding text break the literal match.
    return redactText(redactCollectedIdentifiers(value, ids));
  }

  if (Array.isArray(value)) {
    // Sequential (not Promise.all) so redactText's detect() calls never run
    // concurrently against the shared singleton detector — see redactText.
    const arr: unknown[] = [];
    for (const item of value) arr.push(await redactValue(item, ids));
    return arr;
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const names = pseudonymIdProperties();
    const columnIndexes = pseudonymColumnIndexes(record);
    const namedPair = isNamedIdentifierPair(record);
    const out: Record<string, unknown> = {};
    for (const [key, member] of Object.entries(record)) {
      const lowerKey = key.toLowerCase();
      // Pass A: the value sits under a pseudonymous-identifier property name,
      // either as the object key or as a Seq name/value pair.
      if (names.has(lowerKey) || (namedPair && PSEUDONYM_NAMED_VALUE_KEYS.includes(lowerKey))) {
        out[key] = maskIdentifierValue(member);
        continue;
      }
      if (columnIndexes && key === 'Rows' && Array.isArray(member)) {
        out[key] = await redactRows(member, columnIndexes, ids);
        continue;
      }
      out[key] = await redactValue(member, ids);
    }
    return out;
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
      if (redacted !== candidate) return redacted;
    }
    return value;
  }

  return value;
}

/**
 * Recursively redact personal data from any JSON-serialisable value
 * (objects, arrays, strings). Structure and non-string values are preserved;
 * 11-digit integers are also checked so a fødselsnummer stored as a number
 * is still masked.
 *
 * Pseudonymous identifiers (`PatientId` and friends — see
 * {@link DEFAULT_PSEUDONYM_ID_PROPERTIES}) are masked in three passes, because
 * the same identifier reaches the caller through three different shapes and
 * only the first of them carries the property name next to the value:
 *
 *  - **A — structural.** A value under an identifier property name is replaced
 *    wholesale, whether that name is the object key, the `Name`/`PropertyName`
 *    member of a Seq name/value pair, or a `Columns` header of a `sql_query`
 *    rowset.
 *  - **B — name-anchored text.** `PatientId = '3fa8…'` inside a string, handled
 *    in {@link redactText} so it also covers Seq error bodies.
 *  - **C — value-anchored text.** Every identifier value found by A or B is
 *    then swept out of every string in the SAME response, so a rendered message
 *    that repeats the GUID without naming it is masked with the identical
 *    placeholder. Only distinctive values take part — see
 *    {@link isDistinctiveIdValue}.
 *
 * @param value - The value to redact
 * @returns A new value with personal data masked
 */
export async function redactDeep<T>(value: T): Promise<T> {
  if (!isRedactionEnabled()) return value;

  const collected = new Set<string>();
  collectPseudonymValues(value, collected);

  return (await redactValue(value, compileCollectedIdentifiers(collected))) as T;
}
