/**
 * Configuration for the remote (hosted HTTP) Seq connector. Users sign in with
 * Microsoft Entra (OAuth 2.1) — the same model as the WebMed Lime/m365
 * connectors. The Entra leg purely AUTHENTICATES the caller; the Seq API key
 * (SEQ_API_KEY, read in server.ts) stays global and server-side. All four Entra
 * vars below are REQUIRED for the remote server — it refuses to start without
 * them (fail-closed).
 *
 * The stdio entry point (seq-server.ts) does NOT use this — it needs no public
 * URL or OAuth app and never imports express/msal.
 */
import type { EntraConfig } from "./remote/provider.js";
import { loadServiceAuthConfig, type ServiceAuthConfig } from "./remote/service-auth.js";

export interface RemoteConfig {
  entra: EntraConfig;
  /** Public https origin claude.ai reaches (REMOTE_PUBLIC_URL). */
  publicBaseUrl: string;
  /**
   * Machine-to-machine auth (Entra app-only tokens presented by headless callers
   * such as Claude-in-Slack via an "OAuth 2.0 client credentials" credential).
   * null = disabled (opt-in via ENTRA_ALLOWED_CLIENT_IDS). See remote/service-auth.ts.
   */
  serviceAuth: ServiceAuthConfig | null;
}

/**
 * Default sign-in scopes: OIDC only. The connector never calls Microsoft Graph,
 * so it requests no Graph permissions — sign-in exists purely to authenticate
 * the user. offline_access is harmless here (our own opaque tokens carry the
 * session); it is kept so the set matches a standard delegated login.
 */
const DEFAULT_ENTRA_SCOPES = ["openid", "profile", "email", "offline_access"];

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. The remote connector refuses to start without it (fail-closed).`,
    );
  }
  return value.trim();
}

export function loadRemoteConfig(): RemoteConfig {
  // Public https origin claude.ai reaches; the OAuth metadata and /callback URI
  // are derived from it. Must be an absolute https URL (the redirect URI Entra
  // returns to is built from this, so an http/relative value would break the flow).
  const rawPublicUrl = required("REMOTE_PUBLIC_URL");
  let publicBaseUrl: string;
  try {
    const parsed = new URL(rawPublicUrl);
    if (parsed.protocol !== "https:") {
      throw new Error("not https");
    }
    publicBaseUrl = parsed.origin;
  } catch {
    throw new Error(
      `REMOTE_PUBLIC_URL must be a valid absolute https URL (got "${process.env.REMOTE_PUBLIC_URL}").`,
    );
  }

  const scopes = (process.env.ENTRA_SCOPES?.trim() || DEFAULT_ENTRA_SCOPES.join(" "))
    .split(/\s+/)
    .filter(Boolean);

  const entra: EntraConfig = {
    tenantId: required("TENANT_ID"),
    clientId: required("CLIENT_ID"),
    clientSecret: required("CLIENT_SECRET"),
    scopes,
  };

  const serviceAuth = loadServiceAuthConfig(entra.tenantId);

  return { entra, publicBaseUrl, serviceAuth };
}
