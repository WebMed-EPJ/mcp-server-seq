/**
 * GUID scrubbing — the patient-identifier control.
 *
 * WebMed EPJ identifies a patient by a GUID, and those GUIDs travel: into
 * document text and file names, into mail and meeting subjects, into support
 * notes, into list items, into log lines quoted by a colleague. A field-name
 * deny-list cannot catch that (the GUID sits in free text, not in a field
 * called `patientId`), and neither can the PII detector in redaction.ts — its
 * curated pattern set is about phone numbers, cards and fødselsnummer, and it
 * only runs on content the label gate marked as needing redaction. A patient
 * GUID in a General-labeled document would go to the model verbatim.
 *
 * So this module is deliberately NOT part of that machinery. It is pure,
 * synchronous, dependency-free and UNCONDITIONAL: every text field this
 * connector returns is passed through stripGuids, whatever the label says and
 * whatever the read scope is. There is no verbatim path for a GUID and no env
 * flag to turn this off — an identifier we cannot interpret is one we cannot
 * clear, so it does not leave.
 *
 * WHAT IS NOT SCRUBBED, and why. A GUID is also how Microsoft addresses things,
 * and a connector whose handles are masked is a connector that cannot work: a
 * SharePoint `siteId`/`listId`, an item `etag`, a sensitivity-label id, a
 * To Do/Planner id, a `docId`, a transcript id. Those are returned VERBATIM, by
 * field, at the call sites — never by pattern, because a pattern cannot tell a
 * label id from a patient id. The rule is therefore: identifiers the CONNECTOR
 * issues or consumes stay; every string a HUMAN wrote is scrubbed. When adding a
 * tool, that is the question to answer for each field it returns.
 *
 * Duplicated verbatim across every MCP package WebMed runs: the three here
 * (m365-privacy-connector, lime-crm-connector, services/lime-connect-bot) and
 * WebMed-EPJ/mcp-server-seq's src/guids.ts, like logger.ts and redaction.ts.
 * Each is github-sourced and separately bundled, so they cannot share a module.
 * Keep the copies byte-identical — a fix to these patterns must be diffable
 * straight across, including into the other repository — and CPD-excluded.
 */

/** Marker written in place of a GUID. `n` is per call — see stripGuids. */
const MARKER = (n: number): string => `[GUID_${n}]`;

/**
 * Canonical 8-4-4-4-12 form, the one a .NET `Guid.ToString()` produces and the
 * one patient ids arrive in.
 *
 * NO boundary guard, deliberately. The shape IS its own boundary — a 32-hex
 * string broken by hyphens in exactly that rhythm is not something prose
 * produces — and every guard tried here cost real matches: `\b` misses
 * `patient_3f2504e0-…` (underscore is a word character), and an alphanumeric
 * lookbehind misses the URL-encoded `Journal%203f2504e0-…`, where the `0` of
 * `%20` abuts the id. Matching a GUID glued to neighbouring characters may leave
 * a stray character behind; failing to match one leaves a patient id.
 */
const GUID_HYPHENATED = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * The "N" form — 32 hex digits, no hyphens — as a URL segment, a cache key or a
 * database column renders it. Same identifier, so it has to go too.
 *
 * This one DOES need the hex guard, for the opposite reason: without it, any
 * 32-digit window of a longer hex run matches, so a SHA-1 (40) or SHA-256 (64)
 * digest would come back mangled — a silent corruption of something a reader
 * might be comparing. With the guard the digest is returned intact and only a
 * free-standing 32-hex run is replaced. An MD5 is indistinguishable from a
 * compact GUID and is therefore replaced; accepted knowingly, since a bare
 * 32-hex run in prose carries no meaning a reader loses, and a patient id that
 * was hashed or re-encoded is exactly what this pattern is for. The cost of the
 * guard is the mirror of the hyphenated form's: a compact GUID with a hex
 * character glued to it is missed.
 *
 * IN LOG DATA THIS PATTERN HAS A REAL COST, measured against WebMed's test Seq:
 * a W3C `TraceId` and Seq's own `event-<32 hex>` id are both bare 32-hex runs,
 * and nothing in the text tells them apart from an identifier. A connector over
 * logs must therefore exempt those FIELDS before scrubbing (stripGuidsDeep's
 * `exemptKeys` is that seam) — masking them would cost request correlation and
 * the paging cursor. The two connectors here are unaffected: their handles are
 * hyphenated GUIDs kept by field, and SharePoint's ContentTypeId is a longer hex
 * run than the guard allows. See guids.test.ts for the pinned shapes.
 */
const GUID_COMPACT = /(?<![0-9a-z])[0-9a-f]{32}(?![0-9a-z])/gi;

/**
 * Alias map: the same GUID gets the same marker everywhere it appears. The scope
 * is ONE RETURNED ITEM — pass one map across the fields of a single record
 * (subject + body, name + text + note) so a reader can see that two fields name
 * the same thing without either of them naming WHAT.
 *
 * Deliberately no WIDER than the item: sharing a map across the items of a page
 * would make the same marker in two records say that both concern the same
 * patient, which is the linkage the mask exists to remove. And deliberately
 * never process-wide — a stable global mapping would be a pseudonym that
 * survives across users and sessions, i.e. a re-identification key rather than a
 * redaction. Same reasoning as `deterministic: false` on the PII detector.
 */
export type GuidAliases = Map<string, string>;

/** A fresh alias map, to be threaded through one record's fields. */
export function createGuidAliases(): GuidAliases {
  return new Map();
}

/**
 * Replace every GUID in `text` with a `[GUID_n]` marker. Pure, total (it cannot
 * throw, so there is no fail-closed case to handle), and a no-op on text that
 * holds none — which is the overwhelmingly common case, so the scan is cheap
 * enough to run on every field of every response.
 */
export function stripGuids(text: string, aliases?: GuidAliases): string {
  if (!text) {
    return text;
  }
  const seen = aliases ?? createGuidAliases();
  const replace = (match: string): string => {
    const key = match.toLowerCase();
    const existing = seen.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const marker = MARKER(seen.size + 1);
    seen.set(key, marker);
    return marker;
  };
  return text.replace(GUID_HYPHENATED, replace).replace(GUID_COMPACT, replace);
}

/** Does this text carry a GUID? Used for counting/reporting, never for gating. */
export function containsGuid(text: string): boolean {
  // Fresh regex state: both patterns are /g, so lastIndex must not leak between
  // calls. RegExp.prototype.test on a /g regex advances it; .search does not.
  return text.search(GUID_HYPHENATED) !== -1 || text.search(GUID_COMPACT) !== -1;
}

/**
 * Strip GUIDs from every string in a value, at any depth — for a payload built
 * of free text (a list item's fields, a projected record) rather than named
 * fields. Keys are left alone: a key is schema, not content.
 *
 * `exemptKeys` (lower-cased, matched exactly) names the members that hold a
 * HANDLE rather than content and must survive intact. Nothing deeper than
 * `maxDepth` is walked; the caller's own depth guard decides what that means for
 * its shape, and an over-deep subtree is returned as-is rather than dropped —
 * this function's contract is "removes GUIDs", not "fails closed". Callers that
 * need fail-closed behaviour (scrubListFields) already have it.
 */
export function stripGuidsDeep(
  value: unknown,
  options?: { aliases?: GuidAliases; exemptKeys?: readonly string[]; maxDepth?: number },
): unknown {
  const aliases = options?.aliases ?? createGuidAliases();
  const exempt = new Set((options?.exemptKeys ?? []).map((k) => k.toLowerCase()));
  const maxDepth = options?.maxDepth ?? 16;
  const walk = (node: unknown, depth: number): unknown => {
    if (depth > maxDepth) {
      return node;
    }
    if (typeof node === "string") {
      return stripGuids(node, aliases);
    }
    if (Array.isArray(node)) {
      return node.map((item) => walk(item, depth + 1));
    }
    if (node !== null && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        out[k] = exempt.has(k.toLowerCase()) ? v : walk(v, depth + 1);
      }
      return out;
    }
    return node;
  };
  return walk(value, 0);
}
