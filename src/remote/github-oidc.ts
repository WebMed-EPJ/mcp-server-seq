/**
 * GitHub Actions OIDC (keyless) authentication for the remote Seq connector.
 *
 * The interactive path (provider.ts) is user OAuth 2.1 (auth-code + PKCE) and
 * the service path (service-auth.ts) validates Entra app-only tokens. Neither
 * fits unattended GitHub Actions automation — specifically our GitHub Agentic
 * Workflows (gh-aw) runs, whose MCP gateway obtains a **GitHub Actions OIDC
 * JWT** and sends it verbatim as the `/mcp` bearer. There is NO Entra token
 * exchange for that caller, so this server must validate the raw GitHub token
 * itself.
 *
 * This module VALIDATES a GitHub Actions OIDC JWT as a resource server:
 * signature (GitHub's JWKS, discovered from the OIDC issuer), issuer, audience,
 * standard time claims, and — the security gate — an allow-list on the GitHub
 * claims (`repository`, `repository_owner`, `sub`). The Seq API key stays global
 * and server-side; a valid GitHub token only AUTHENTICATES the automation
 * caller, exactly like an authenticated Entra user.
 *
 * Fail-safe: disabled unless GITHUB_OIDC_ENABLED is truthy (loadGitHubOidcConfig
 * returns null), so a deployment that doesn't opt in behaves exactly as before.
 * When enabled but no allow-list is configured, the verifier DEFAULT-DENIES
 * every GitHub token (fail-closed) — the caller logs a startup warning.
 */
import { jwtVerify, decodeJwt, createRemoteJWKSet, type JWTVerifyGetKey, type KeyLike } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { ServiceTokenVerifier } from "./service-auth.js";
import { errorFields, silentLogger, type Logger } from "../logger.js";

/** The public GitHub Actions OIDC issuer. Overridable for GHES (GITHUB_OIDC_ISSUER). */
export const DEFAULT_GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";

export interface GitHubOidcConfig {
  /** Exact expected `iss` (default = the public GitHub Actions issuer). */
  issuer: string;
  /**
   * Expected `aud`. gh-aw's `auth.audience` defaults to the MCP server URL, so
   * this must equal what gh-aw sends (recommend the public origin, e.g.
   * `https://seq-mcp.public.webmedepj.no`). Enforced strictly — a token minted
   * for any other audience is rejected.
   */
  audience: string;
  /** Allowed `repository` claims, e.g. `WebMed-EPJ/epj`. */
  allowedRepositories: string[];
  /** Allowed `repository_owner` claims, e.g. `WebMed-EPJ`. */
  allowedOwners: string[];
  /** Allowed `sub` patterns (glob: `*`/`?`), e.g. `repo:WebMed-EPJ/epj:*`. */
  allowedSubjects: string[];
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const TRUTHY_RE = /^(1|true|yes|on)$/i;

/** True when every allow-list is empty — the verifier then denies all tokens. */
export function githubOidcAllowListEmpty(config: GitHubOidcConfig): boolean {
  return (
    config.allowedRepositories.length === 0 &&
    config.allowedOwners.length === 0 &&
    config.allowedSubjects.length === 0
  );
}

/**
 * Build the GitHub OIDC config from the environment, or return null (disabled)
 * unless GITHUB_OIDC_ENABLED is truthy — the path is opt-in. Throws
 * (fail-closed) when enabled but GITHUB_OIDC_AUDIENCE is missing: without the
 * expected audience a token minted for a different resource would be accepted.
 *
 * NOTE: an empty allow-list does NOT throw here — the server still starts and
 * the verifier default-denies every GitHub token. remote.ts logs a startup
 * warning for that case so the misconfiguration is visible.
 */
export function loadGitHubOidcConfig(): GitHubOidcConfig | null {
  const enabled = TRUTHY_RE.test((process.env.GITHUB_OIDC_ENABLED ?? "").trim());
  if (!enabled) return null;

  const audience = process.env.GITHUB_OIDC_AUDIENCE?.trim();
  if (!audience) {
    throw new Error(
      "GITHUB_OIDC_ENABLED is true but GITHUB_OIDC_AUDIENCE is missing. " +
        "Refusing to start: without the expected audience a token minted for a different resource would be accepted (fail-closed).",
    );
  }

  const issuer = process.env.GITHUB_OIDC_ISSUER?.trim() || DEFAULT_GITHUB_OIDC_ISSUER;

  return {
    issuer,
    audience,
    allowedRepositories: splitList(process.env.GITHUB_OIDC_ALLOWED_REPOSITORIES),
    allowedOwners: splitList(process.env.GITHUB_OIDC_ALLOWED_OWNERS),
    allowedSubjects: splitList(process.env.GITHUB_OIDC_ALLOWED_SUBJECTS),
  };
}

/**
 * Compile a subject glob (`*` = any run of chars, `?` = one char) to an
 * anchored RegExp. All other characters are matched literally.
 */
function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex specials (leaves * and ?)
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

/** GitHub's JWKS lives at `<issuer>/.well-known/jwks` (per its OIDC discovery). */
function jwksUrlForIssuer(issuer: string): URL {
  return new URL(`${issuer.replace(/\/+$/, "")}/.well-known/jwks`);
}

/**
 * Create a verifier for GitHub Actions OIDC JWTs. Returns AuthInfo on a valid,
 * allow-listed token; returns null otherwise so the caller falls through to the
 * next verifier (Entra service token, then the interactive-user store, then a
 * 401). It self-gates on the issuer: a bearer whose `iss` is NOT the configured
 * GitHub issuer returns null WITHOUT any signature work, so the Entra/user paths
 * are untouched (dual-issuer routing). `keyInput` defaults to GitHub's remote
 * JWKS (cached, with key-rotation handling); tests inject a local key.
 */
export function createGitHubOidcVerifier(
  config: GitHubOidcConfig,
  keyInput?: JWTVerifyGetKey | KeyLike | Uint8Array,
  logger: Logger = silentLogger,
): ServiceTokenVerifier {
  // jose has separate overloads for a static key vs a getKey function. Normalize
  // to a single JWTVerifyGetKey (wrap a static test key in a resolver) so the
  // call site is one unambiguous overload — no union, no cast, no dual-branch.
  const getKey: JWTVerifyGetKey =
    typeof keyInput === "function"
      ? keyInput
      : keyInput !== undefined
        ? () => keyInput
        : createRemoteJWKSet(jwksUrlForIssuer(config.issuer));

  // GitHub `repository`/`repository_owner` identities are effectively
  // case-insensitive, so match them lowercased — an operator pasting a differently
  // cased env value must not lock out a legitimate caller. `sub` is NOT lowercased:
  // it embeds git refs (e.g. `…:ref:refs/heads/Feature`), which ARE case-sensitive.
  const repos = new Set(config.allowedRepositories.map((r) => r.toLowerCase()));
  const owners = new Set(config.allowedOwners.map((o) => o.toLowerCase()));
  const subjectMatchers = config.allowedSubjects.map(globToRegExp);
  const allowListEmpty = githubOidcAllowListEmpty(config);

  return async (token: string): Promise<AuthInfo | null> => {
    // Cheap gate: opaque user tokens (not JWTs) fall straight through.
    if (token.split(".").length !== 3) return null;

    // Route by issuer WITHOUT trusting the signature: only tokens claiming the
    // GitHub issuer are ours to validate. Anything else (an Entra JWT, junk)
    // returns null so the next verifier handles it. decodeJwt does no crypto.
    let unverifiedIss: unknown;
    try {
      unverifiedIss = decodeJwt(token).iss;
    } catch {
      return null;
    }
    if (unverifiedIss !== config.issuer) return null;

    // From here the token CLAIMS to be a GitHub OIDC token; every failure below
    // is a rejection (null → ultimately 401), never a fall-through to Entra.
    let payload: Record<string, unknown>;
    try {
      // jwtVerify enforces the signature (GitHub JWKS), exact issuer, exact
      // audience, and exp/nbf/iat (60s clock skew). alg is pinned to RS256, so
      // an `alg: none` / unsigned token can never validate.
      ({ payload } = await jwtVerify(token, getKey, {
        issuer: config.issuer,
        audience: config.audience,
        algorithms: ["RS256"],
        clockTolerance: 60,
      }));
    } catch (err) {
      // Signature/issuer/audience/expiry failure — errorFields is PII-safe and
      // never logs the token itself.
      logger.warn("GitHub OIDC token verification failed", errorFields(err));
      return null;
    }

    // Default-deny: with no allow-list configured, reject every GitHub token
    // even after a valid signature. The startup warning (remote.ts) explains it.
    if (allowListEmpty) {
      logger.warn("GitHub OIDC token rejected: no allow-list configured (fail-closed)");
      return null;
    }

    const repository = typeof payload.repository === "string" ? payload.repository : "";
    const repositoryOwner = typeof payload.repository_owner === "string" ? payload.repository_owner : "";
    const sub = typeof payload.sub === "string" ? payload.sub : "";

    // The security gate: accept only if a configured allow-list rule matches.
    const matches =
      (repository !== "" && repos.has(repository.toLowerCase())) ||
      (repositoryOwner !== "" && owners.has(repositoryOwner.toLowerCase())) ||
      (sub !== "" && subjectMatchers.some((re) => re.test(sub)));

    if (!matches) {
      // repository/owner/sub are GitHub identifiers, not user PII — safe to log
      // for triage (mirrors service-auth logging the caller's azp).
      logger.warn("GitHub OIDC token from a non-allow-listed principal", { repository, repositoryOwner, sub });
      return null;
    }

    return {
      token,
      clientId: repository !== "" ? `github:${repository}` : `github:${sub}`,
      scopes: [],
      expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
      extra: {
        github: true,
        homeAccountId: `github:${sub || repository}`,
        repository,
        repositoryOwner,
        sub,
      },
    };
  };
}
