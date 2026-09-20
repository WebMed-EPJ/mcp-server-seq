import { hostFromUrl, PRODUCTION_SEQ_HOSTS } from './seq-host.js';

/**
 * Signal scope that is forced onto every event and query call, per Seq host.
 *
 * WebMed production Seq ingests roughly a million events an hour and the bulk
 * of it is Debug/Trace/Verbose noise no investigation wants. The "No Debug"
 * signal is what a human clicks in the Seq UI before reading anything; this
 * applies it server-side so a connector call cannot skip it.
 *
 * Two properties are deliberate:
 *
 * 1. **Hard-coded, with no environment override.** There is no
 *    `SEQ_MANDATORY_SIGNAL` and no disable flag — the scope cannot be removed
 *    by configuration, only by editing this table. Same argument as
 *    `PRODUCTION_SEQ_HOSTS` in `redact.ts`: an env var is what gets copied from
 *    one overlay into another, so a control that matters cannot be one.
 * 2. **Keyed by HOST, not by an "is production" boolean.** A Seq signal id is
 *    issued by, and only means anything on, the instance that holds it —
 *    `signal-6612` is a row in production's own database. Forcing it onto any
 *    other instance would not narrow a query, it would make Seq reject every
 *    call. So an unknown or unparseable SEQ_BASE_URL gets NO forced signal:
 *    that host is not the production instance this id belongs to, and a
 *    connector that refuses every query is not the safer failure here.
 *
 * Production is the only entry by design — the test instance is read with
 * Debug events intact.
 *
 * The keys are NOT derived from `PRODUCTION_SEQ_HOSTS`, for the same
 * per-instance reason: a second production instance would carry a signal id of
 * its own, and deriving the map would silently give it this one. What the two
 * lists must not do is DRIFT — a host added to `PRODUCTION_SEQ_HOSTS` and
 * forgotten here would be redacted but read with Debug events — so
 * `mandatorySignalCoverageGap()` states the invariant and a unit test fails on
 * it. An alias for an instance already listed takes the same id as the host it
 * aliases; a genuinely new instance needs its own signal looked up in Seq.
 */
export interface MandatorySignal {
  /** The Seq signal id, as issued by the instance in question. */
  readonly id: string;
  /** The signal's title in Seq, so a refused-looking result is explainable. */
  readonly title: string;
  /** What it filters out, in the words the tool description uses. */
  readonly effect: string;
}

const MANDATORY_SIGNALS: ReadonlyMap<string, MandatorySignal> = new Map([
  [
    'seq.intern.webmed.no',
    {
      id: 'signal-6612',
      title: 'No Debug',
      effect: 'Debug, Trace and Verbose events are excluded',
    },
  ],
]);

/**
 * The signal forced onto calls against a given Seq host.
 *
 * @param host canonical hostname, as produced by `seq-host.ts`
 * @returns the mandatory signal, or null when that host has none
 */
export function mandatorySignalForHost(host: string | null): MandatorySignal | null {
  return (host !== null ? MANDATORY_SIGNALS.get(host) : undefined) ?? null;
}

/**
 * The signal forced onto calls against a given Seq base URL.
 *
 * Callers pass the very URL their requests go to, rather than re-reading the
 * environment, so the forced scope cannot end up describing a different
 * instance from the one being queried.
 *
 * @param url the upstream Seq base URL
 * @returns the mandatory signal, or null when that instance has none
 */
export function mandatorySignalForUrl(url: string | undefined): MandatorySignal | null {
  return mandatorySignalForHost(hostFromUrl(url));
}

/**
 * Merge the caller's `signal` argument with the mandatory one.
 *
 * Seq INTERSECTS comma-separated signal ids (verified against production: a
 * tenant signal plus `signal-6612` returns that tenant's non-Debug events, not
 * the union), so adding an id can only narrow the result — a caller's own
 * scoping survives untouched and cannot widen past the forced signal.
 *
 * @param requested the caller-supplied comma-separated signal ids, if any
 * @param mandatory the forced signal for this instance, or null for none
 * @returns the signal argument to send to Seq, or undefined for no scoping
 */
export function applyMandatorySignal(
  requested: string | undefined,
  mandatory: MandatorySignal | null,
): string | undefined {
  if (!mandatory) return requested;
  const callerIds = (requested ?? '')
    .split(',')
    .map((id) => id.trim())
    // A caller naming the mandatory signal itself is not an error, but Seq
    // should not be sent the same id twice.
    .filter((id) => id !== '' && id.toLowerCase() !== mandatory.id.toLowerCase());
  return [mandatory.id, ...callerIds].join(',');
}

/**
 * The sentence appended to the tool descriptions of every scoped tool.
 *
 * Without it a model reads the missing Debug events as a broken query and
 * keeps widening the window looking for them.
 *
 * @param mandatory the forced signal for this instance
 * @returns a description fragment naming the signal and that it is not optional
 */
export function mandatorySignalNotice(mandatory: MandatorySignal): string {
  return (
    `ALWAYS-ON SCOPE: every call is scoped to the "${mandatory.title}" signal ` +
    `(${mandatory.id}) on this Seq instance, so ${mandatory.effect} and cannot be ` +
    `retrieved through this connector. The scope is applied server-side and cannot ` +
    `be switched off; a 'signal' you pass is intersected with it (AND), not used ` +
    `instead of it. Do not treat missing Debug-level events as a failed query.`
  );
}

/**
 * Production hosts that have no mandatory signal.
 *
 * The invariant behind the two host-keyed controls in this server: every host
 * `redact.ts` treats as production must also be scoped here, or a host would be
 * redacted while still serving Debug events. Enforced by a unit test rather
 * than at startup — it can only be broken by editing one of the two tables, so
 * the failure belongs in CI, not in a running pod.
 *
 * @returns the production hosts missing an entry; empty when the two agree
 */
export function mandatorySignalCoverageGap(): string[] {
  return PRODUCTION_SEQ_HOSTS.filter((host) => !MANDATORY_SIGNALS.has(host));
}
