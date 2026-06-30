/**
 * OAuth 2.1 authorization-server provider for the remote Seq connector,
 * federating the actual sign-in to Microsoft Entra (the WebMed tenant). This is
 * the same model as the WebMed Lime/m365 connectors, with the Lime difference:
 * the Seq API key is GLOBAL and lives only on the server, so there is no
 * per-user downstream token to acquire or refresh. The Entra leg here is purely
 * AUTHENTICATION — it proves the caller is a signed-in WebMed user before they
 * reach the shared, redacting Seq tools.
 *
 * Flow (claude.ai ⇄ this server ⇄ Entra):
 *  1. claude.ai dynamically registers (DCR) and calls /authorize with PKCE.
 *  2. authorize() redirects the user to Entra (our own PKCE + state), storing a
 *     pending record.
 *  3. Entra redirects to /callback → handleEntraCallback() exchanges the Entra
 *     code (confidential client) for an id_token + account, then redirects back
 *     to claude.ai with OUR one-time authorization code. We keep only the
 *     account's homeAccountId (for audit) — never the Entra token.
 *  4. claude.ai calls /token → exchangeAuthorizationCode() issues OUR access +
 *     refresh tokens (opaque; mapped to the Entra account).
 *  5. /mcp calls present OUR bearer token → verifyAccessToken(); a valid token
 *     means an authenticated WebMed user, and the handler serves the shared,
 *     redacting Seq tools.
 *
 * The connector never calls Microsoft Graph and requests only OIDC scopes, so no
 * MSAL token cache outlives the sign-in: our own opaque tokens carry the session.
 */
import type { Response } from "express";
import { ConfidentialClientApplication, CryptoProvider } from "@azure/msal-node";
import type { AuthorizationParams, OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { InvalidRequestError, InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { OAuthStore } from "./stores.js";

/** The Entra app registration + sign-in scopes used to authenticate users. */
export interface EntraConfig {
  tenantId: string;
  clientId: string;
  /** Confidential-client secret (required for the Web redirect /callback leg). */
  clientSecret: string;
  /** Scopes requested at sign-in. Authentication-only: OIDC scopes, no Graph. */
  scopes: string[];
}

export interface RemoteOptions {
  entra: EntraConfig;
  /** Public https origin claude.ai reaches, e.g. "https://seq-mcp.webmed.no". */
  publicBaseUrl: string;
}

export class EntraOAuthProvider implements OAuthServerProvider {
  private readonly store = new OAuthStore();
  private readonly cca: ConfidentialClientApplication;
  private readonly crypto = new CryptoProvider();
  private readonly callbackUri: string;
  private readonly scopes: string[];

  constructor(private readonly opts: RemoteOptions) {
    const { entra } = opts;
    if (!entra.clientSecret) {
      throw new Error("Remote connector requires CLIENT_SECRET (confidential client) for the Entra OAuth exchange.");
    }
    this.cca = new ConfidentialClientApplication({
      auth: {
        clientId: entra.clientId,
        authority: `https://login.microsoftonline.com/${entra.tenantId}`,
        clientSecret: entra.clientSecret,
      },
    });
    this.callbackUri = new URL("/callback", opts.publicBaseUrl).href;
    this.scopes = entra.scopes;
  }

  get clientsStore(): OAuthStore {
    return this.store;
  }

  /** Evict expired OAuth state (pending flows, codes, sessions, refresh tokens).
   *  Call on an interval — see remote.ts. */
  sweepExpired(): void {
    this.store.sweep();
  }

  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    // Defense-in-depth against open redirect / code leakage: only ever redirect
    // back to a URI the client registered. The SDK's auth router validates this
    // upstream, but we re-check at the source since handleEntraCallback later
    // res.redirect()s to this value — never redirect to an unregistered URI even
    // if upstream validation changes or a different router is wired in.
    if (!client.redirect_uris?.includes(params.redirectUri)) {
      throw new InvalidRequestError("redirect_uri is not registered for this client.");
    }
    // Our own PKCE + state for the Entra leg (independent of the MCP client's).
    const { verifier, challenge } = await this.crypto.generatePkceCodes();
    const entraState = this.crypto.createNewGuid();
    this.store.putPending(entraState, {
      mcpClientId: client.client_id,
      mcpRedirectUri: params.redirectUri,
      mcpState: params.state,
      mcpCodeChallenge: params.codeChallenge,
      entraVerifier: verifier,
    });
    const url = await this.cca.getAuthCodeUrl({
      scopes: this.scopes,
      redirectUri: this.callbackUri,
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      state: entraState,
      prompt: "select_account",
    });
    res.redirect(url);
  }

  /** Express GET /callback — Entra redirects here after the user signs in. */
  async handleEntraCallback(query: Record<string, unknown>, res: Response): Promise<void> {
    const entraState = typeof query.state === "string" ? query.state : "";
    const code = typeof query.code === "string" ? query.code : "";
    const errorMsg =
      (typeof query.error_description === "string" && query.error_description) ||
      (typeof query.error === "string" && query.error) ||
      "";

    const pending = this.store.takePending(entraState);
    if (!pending) {
      res.status(400).send("Unknown or expired authorization state.");
      return;
    }

    const back = (params: Record<string, string>) => {
      const redirect = new URL(pending.mcpRedirectUri);
      for (const [k, v] of Object.entries(params)) redirect.searchParams.set(k, v);
      if (pending.mcpState) redirect.searchParams.set("state", pending.mcpState);
      res.redirect(redirect.href);
    };

    if (!code) {
      back({ error: "access_denied", error_description: errorMsg || "Sign-in failed." });
      return;
    }

    try {
      const result = await this.cca.acquireTokenByCode({
        code,
        scopes: this.scopes,
        redirectUri: this.callbackUri,
        codeVerifier: pending.entraVerifier,
      });
      const homeAccountId = result.account?.homeAccountId;
      if (!homeAccountId) {
        back({ error: "server_error", error_description: "No account returned by Entra." });
        return;
      }
      const ourCode = this.store.issueCode({
        mcpClientId: pending.mcpClientId,
        mcpCodeChallenge: pending.mcpCodeChallenge,
        homeAccountId,
      });
      back({ code: ourCode });
    } catch (err) {
      back({ error: "server_error", error_description: (err as Error).message });
    }
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    // Peek (don't consume) so the SDK can PKCE-verify before exchange.
    const rec = this.store.peekCode(authorizationCode);
    if (!rec || rec.mcpClientId !== client.client_id) {
      throw new Error("invalid_grant");
    }
    return rec.mcpCodeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<OAuthTokens> {
    const rec = this.store.takeCode(authorizationCode);
    if (!rec || rec.mcpClientId !== client.client_id) {
      throw new Error("invalid_grant");
    }
    return this.issue(client.client_id, rec.homeAccountId);
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
  ): Promise<OAuthTokens> {
    const rec = this.store.takeRefresh(refreshToken);
    if (!rec || rec.clientId !== client.client_id) {
      throw new Error("invalid_grant");
    }
    // Preserve the chain's original issuance time so the absolute lifetime
    // survives rotation (otherwise refreshing would reset the 30-day cap).
    return this.issue(client.client_id, rec.homeAccountId, rec.createdAt);
  }

  /**
   * RFC 7009 token revocation — backs the /revoke endpoint (the SDK only mounts
   * and advertises it when this method exists). Lets a user invalidate a leaked
   * or signed-out session immediately instead of waiting out the 30-day refresh
   * cap. We drop the token from BOTH stores regardless of token_type_hint (the
   * hint is only an optimization, and our access/refresh tokens never collide),
   * so revoking either an access or a refresh token always lands. Idempotent.
   */
  async revokeToken(_client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
    this.store.revokeAccess(request.token);
    this.store.revokeRefresh(request.token);
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const s = this.store.verifyAccess(token);
    if (!s) {
      // MUST be the SDK's InvalidTokenError, not a plain Error: requireBearerAuth
      // maps a bare Error to 500 server_error (fatal to the client), but an
      // InvalidTokenError to 401 + WWW-Authenticate, which makes the client drop
      // the stale token and re-run OAuth. This is exactly the case where the
      // process restarted (in-memory store wiped) and a cached bearer token from
      // a previous session is presented — e.g. claude.ai via mcp-remote.
      throw new InvalidTokenError("Token is invalid, expired, or from a previous server session.");
    }
    return {
      token,
      clientId: s.clientId,
      scopes: s.scopes,
      expiresAt: s.expiresAt,
      extra: { homeAccountId: s.homeAccountId },
    };
  }

  private issue(clientId: string, homeAccountId: string, issuedAt?: number): OAuthTokens {
    const t = this.store.issueTokens(clientId, homeAccountId, this.scopes, issuedAt);
    return {
      access_token: t.accessToken,
      token_type: "Bearer",
      expires_in: t.expiresInSeconds,
      refresh_token: t.refreshToken,
      scope: this.scopes.join(" "),
    };
  }
}
