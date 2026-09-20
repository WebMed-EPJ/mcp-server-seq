/**
 * One reading of "which Seq instance is this server talking to".
 *
 * Two hard-coded production rules key off it — the redaction fence
 * (`redact.ts`) and the mandatory signal scope (`mandatory-signal.ts`) — and
 * neither may carry its own spelling of a hostname: a second spelling is a
 * second thing to keep in sync, and the failure mode of getting it wrong is a
 * control that silently does not apply to production.
 */

/**
 * Seq hosts that serve WebMed production data. Hard-coded on purpose: the
 * controls that consult this list are fenced against environment variables,
 * and an env var is exactly what gets copied from one overlay into another.
 */
export const PRODUCTION_SEQ_HOSTS = ['seq.intern.webmed.no'];

/**
 * One spelling per host, so host comparisons cannot be side-stepped.
 *
 * Two normalisations, both load-bearing. The PORT is dropped (`URL.host` keeps
 * it, so the documented local target `http://localhost:5341` did not match an
 * allow-listed `localhost`). And ONE trailing dot is removed:
 * `seq.intern.webmed.no.` is the same host as `seq.intern.webmed.no` to DNS but
 * not to a string compare, so without this the production entry could be
 * side-stepped by spelling it with the dot.
 *
 * @param host a hostname, with or without port, case and trailing dot
 * @returns the canonical lower-case hostname
 */
export function canonicalHostname(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, '');
}

/**
 * The canonical host of a Seq base URL.
 *
 * @param raw a Seq base URL, possibly unset or unparseable
 * @returns the canonical hostname, or null when it cannot be read
 */
export function hostFromUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    return canonicalHostname(new URL(trimmed).hostname);
  } catch {
    // An unparseable URL is not a host we can clear — treat it as unknown.
    return null;
  }
}

/** The host of the configured upstream Seq, or null when it cannot be read. */
export function seqHost(): string | null {
  return hostFromUrl(process.env.SEQ_BASE_URL);
}
