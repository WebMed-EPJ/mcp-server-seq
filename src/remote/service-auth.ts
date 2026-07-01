/**
 * Service-to-service (machine) authentication for the remote Seq connector.
 *
 * The interactive path (provider.ts) is user OAuth 2.1 (auth-code + PKCE). That
 * can't run headless — e.g. Claude triggered from Slack ("Claude Tag"), which
 * connects with an "OAuth 2.0 client credentials" credential: it exchanges a
 * client_id + secret at a token URL for a short-lived token (RFC 6749 §4.4) and
 * sends that token as the /mcp bearer.
 *
 * We point that token URL at **Microsoft Entra** (the caller has its own Entra
 * app, granted an app role on our API). So the client-credentials grant happens
 * at Entra, not here — this module only VALIDATES the resulting Entra app-only
 * JWT as a resource server: signature (Entra JWKS), issuer, audience, a required
 * app role, and an allow-list of caller app IDs. No secret is minted here.
 *
 * Fail-safe: disabled unless ENTRA_ALLOWED_CLIENT_IDS is set (loadServiceAuthConfig
 * returns null), so a deployment that doesn't opt in behaves exactly as before.
 */
import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey, type KeyLike } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { errorFields, silentLogger, type Logger } from "../logger.js";

export interface ServiceAuthConfig {
  tenantId: string;
  /**
   * Acceptable token audiences. Entra issues app-only tokens with `aud` = the
   * API's App ID URI (`api://…`, v1 tokens) OR the API app's client-id GUID (v2
   * tokens), depending on the app's requestedAccessTokenVersion — set BOTH here
   * to be safe.
   */
  audiences: string[];
  /** Required app role (present in the token's `roles` claim). */
  requiredRole: string;
  /** Allowed caller app IDs (token `azp`/`appid`). */
  allowedClientIds: string[];
}

export type ServiceTokenVerifier = (token: string) => Promise<AuthInfo | null>;

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Entra app (client) IDs are GUIDs — case-insensitive identifiers. Entra emits
 * `azp`/`appid`/GUID `aud` in lowercase, but operators paste the Application
 * (client) ID from the portal in mixed case. Lowercase bare-GUID values so a
 * casing mismatch can't silently lock out a legitimate caller. Non-GUID
 * audiences (App ID URIs like `api://…`) are left untouched.
 */
function normalizeGuid(value: string): string {
  return GUID_RE.test(value) ? value.toLowerCase() : value;
}

/**
 * Build the service-auth config from the environment, or return null (disabled)
 * when ENTRA_ALLOWED_CLIENT_IDS is unset/empty — machine auth is opt-in. Throws
 * (fail-closed) if the allow-list is set but the audience isn't, since we could
 * not then validate the token's intended recipient.
 */
export function loadServiceAuthConfig(tenantId: string): ServiceAuthConfig | null {
  const allowedClientIds = splitList(process.env.ENTRA_ALLOWED_CLIENT_IDS);
  if (allowedClientIds.length === 0) return null;

  const audiences = splitList(process.env.ENTRA_AUDIENCE);
  if (audiences.length === 0) {
    throw new Error(
      "ENTRA_ALLOWED_CLIENT_IDS is set (service-token auth enabled) but ENTRA_AUDIENCE is missing. " +
        "Refusing to start: without the expected audience a token minted for a different API would be accepted (fail-closed).",
    );
  }

  const requiredRole = process.env.ENTRA_REQUIRED_ROLE?.trim() || "Connector.Access";
  return { tenantId, audiences, requiredRole, allowedClientIds };
}

/**
 * Create a verifier for Entra app-only (client-credentials) JWTs. Returns
 * AuthInfo on a valid service token, or null if the bearer isn't a valid Entra
 * service token — the caller then falls through to the interactive-user token
 * store (and ultimately 401 if that also misses). `keyInput` defaults to Entra's
 * JWKS endpoint; tests inject a local key.
 */
export function createServiceTokenVerifier(
  config: ServiceAuthConfig,
  keyInput?: JWTVerifyGetKey | KeyLike | Uint8Array,
  logger: Logger = silentLogger,
): ServiceTokenVerifier {
  // jose has separate overloads for a static key vs a getKey function. Normalize
  // to a single JWTVerifyGetKey (wrap a static test key in a resolver) so the call
  // site is one unambiguous overload — no union, no cast, no dual-branch.
  const getKey: JWTVerifyGetKey =
    typeof keyInput === "function"
      ? keyInput
      : keyInput !== undefined
        ? () => keyInput
        : createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`));
  // Entra emits v2 (login.microsoftonline.com/<tid>/v2.0) or v1 (sts.windows.net/<tid>/) issuers.
  const issuer = [
    `https://login.microsoftonline.com/${config.tenantId}/v2.0`,
    `https://sts.windows.net/${config.tenantId}/`,
  ];
  // GUIDs are case-insensitive; lowercase them so a mixed-case env value still matches.
  const audience = config.audiences.map(normalizeGuid);
  const allowed = new Set(config.allowedClientIds.map(normalizeGuid));

  return async (token: string): Promise<AuthInfo | null> => {
    // Cheap gate: our own tokens are opaque (not JWTs). Skip non-JWTs so a normal
    // user bearer goes straight to the opaque-store path without a failed verify.
    if (token.split(".").length !== 3) return null;

    let payload: Record<string, unknown>;
    try {
      ({ payload } = await jwtVerify(token, getKey, { issuer, audience, algorithms: ["RS256"] }));
    } catch (err) {
      // Signature/issuer/audience/expiry failure — errorFields is PII-safe.
      logger.warn("Entra service token verification failed", errorFields(err));
      return null;
    }

    // App-only (client-credentials) tokens carry `roles`; delegated user tokens
    // carry `scp`. Reject anything with `scp` so only true app tokens pass here.
    if (typeof payload.scp === "string") {
      logger.warn("Rejected token with delegated scopes on the service path");
      return null;
    }

    const roles = Array.isArray(payload.roles) ? (payload.roles as unknown[]).filter((r): r is string => typeof r === "string") : [];
    if (!roles.includes(config.requiredRole)) {
      logger.warn("Entra service token missing required app role", { requiredRole: config.requiredRole });
      return null;
    }

    const azp = typeof payload.azp === "string" ? payload.azp : typeof payload.appid === "string" ? payload.appid : "";
    if (!allowed.has(normalizeGuid(azp))) {
      // azp is an application (client) ID, not user PII — safe to log for triage.
      logger.warn("Entra service token from a non-allow-listed client", { azp });
      return null;
    }

    return {
      token,
      clientId: azp,
      scopes: roles,
      expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
      extra: { homeAccountId: `service:${azp}`, service: true },
    };
  };
}
