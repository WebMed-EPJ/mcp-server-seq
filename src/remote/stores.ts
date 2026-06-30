/**
 * In-memory OAuth state for the remote connector's authorization server: the
 * dynamically-registered MCP clients, short-lived authorization codes, and our
 * issued access/refresh tokens. Each record only ever holds an Entra
 * `homeAccountId` reference — never an Entra token. Like the Lime connector the
 * Seq connector has NO per-user downstream token to refresh (the Seq API key is
 * global, server-side), so the homeAccountId is kept purely to identify and
 * audit the signed-in user; sign-in confirms identity and nothing more.
 *
 * Deliberately separated from the Entra I/O so the token lifecycle is pure and
 * unit-testable (`now`/`genToken` are injectable). PRODUCTION NOTE: this is a
 * single-process in-memory store — for HA / multi-replica / restart-durable
 * deployments, back these maps with a shared store (e.g. Redis).
 */
import { randomBytes, randomUUID } from "node:crypto";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";

/** Our issued access token's lifetime. Governs how often the MCP client rotates. */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
/** Authorization codes and pending federations are short-lived (anti-replay). */
export const CODE_TTL_SECONDS = 5 * 60;
/** Absolute refresh-token lifetime. Rotation alone leaves a leaked refresh
 *  token valid indefinitely; an absolute cap ages the session out (OAuth 2.1). */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
/** Registered DCR clients are kept this long. /register is internet-facing, so
 *  without eviction the clients map grows unbounded (slow leak / cheap DoS).
 *  Tied to the refresh lifetime: a client older than the longest-lived refresh
 *  chain can have no live session, so dropping it is safe — claude.ai simply
 *  re-registers (DCR) on its next connect. */
export const CLIENT_TTL_SECONDS = REFRESH_TOKEN_TTL_SECONDS;

export interface PendingAuth {
  mcpClientId: string;
  mcpRedirectUri: string;
  mcpState?: string;
  mcpCodeChallenge: string;
  entraVerifier: string;
  createdAt: number;
}
export interface IssuedCode {
  mcpClientId: string;
  mcpCodeChallenge: string;
  homeAccountId: string;
  createdAt: number;
}
export interface Session {
  homeAccountId: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
}
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

const defaultGenToken = () => randomBytes(32).toString("base64url");
const defaultNow = () => Math.floor(Date.now() / 1000);

export class OAuthStore implements OAuthRegisteredClientsStore {
  private readonly clients = new Map<string, OAuthClientInformationFull>();
  private readonly pending = new Map<string, PendingAuth>();
  private readonly codes = new Map<string, IssuedCode>();
  private readonly sessions = new Map<string, Session>();
  private readonly refresh = new Map<
    string,
    { homeAccountId: string; clientId: string; scopes: string[]; createdAt: number }
  >();

  constructor(
    private readonly now: () => number = defaultNow,
    private readonly genToken: () => string = defaultGenToken,
  ) {}

  // --- Dynamic client registration (OAuthRegisteredClientsStore) ---
  getClient(clientId: string): OAuthClientInformationFull | undefined {
    return this.clients.get(clientId);
  }
  registerClient(client: OAuthClientInformationFull): OAuthClientInformationFull {
    const full: OAuthClientInformationFull = { ...client };
    if (!full.client_id) {
      full.client_id = randomUUID();
    }
    // Always stamp an issuance time so sweep() can age the client out (the
    // anchor for CLIENT_TTL_SECONDS eviction). Seconds, per the OAuth DCR spec.
    if (!full.client_id_issued_at) {
      full.client_id_issued_at = this.now();
    }
    this.clients.set(full.client_id, full);
    return full;
  }

  // --- Pending Entra federations (keyed by the state we send to Entra) ---
  putPending(entraState: string, p: Omit<PendingAuth, "createdAt">): void {
    this.pending.set(entraState, { ...p, createdAt: this.now() });
  }
  takePending(entraState: string): PendingAuth | undefined {
    const p = this.pending.get(entraState);
    if (!p) return undefined;
    this.pending.delete(entraState);
    return this.now() - p.createdAt > CODE_TTL_SECONDS ? undefined : p;
  }

  // --- Our authorization codes ---
  issueCode(rec: Omit<IssuedCode, "createdAt">): string {
    const code = this.genToken();
    this.codes.set(code, { ...rec, createdAt: this.now() });
    return code;
  }
  /** Non-consuming lookup (the SDK verifies PKCE before exchanging). Expired → undefined. */
  peekCode(code: string): IssuedCode | undefined {
    const rec = this.codes.get(code);
    if (!rec) return undefined;
    return this.now() - rec.createdAt > CODE_TTL_SECONDS ? undefined : rec;
  }
  /** One-time: returns the record and removes it; expired codes are rejected. */
  takeCode(code: string): IssuedCode | undefined {
    const rec = this.codes.get(code);
    if (!rec) return undefined;
    this.codes.delete(code);
    return this.now() - rec.createdAt > CODE_TTL_SECONDS ? undefined : rec;
  }

  // --- Our issued tokens ---
  /**
   * Issue an access + refresh token. `issuedAt` is the refresh CHAIN's original
   * creation time: on a fresh sign-in it defaults to now, but on rotation the
   * caller passes the previous token's `createdAt` so the absolute lifetime is
   * preserved across rotations (otherwise each refresh would reset the clock and
   * the cap would never bite).
   */
  issueTokens(
    clientId: string,
    homeAccountId: string,
    scopes: string[],
    issuedAt: number = this.now(),
  ): IssuedTokens {
    const accessToken = this.genToken();
    const refreshToken = this.genToken();
    this.sessions.set(accessToken, {
      homeAccountId,
      clientId,
      scopes,
      expiresAt: this.now() + ACCESS_TOKEN_TTL_SECONDS,
    });
    this.refresh.set(refreshToken, { homeAccountId, clientId, scopes, createdAt: issuedAt });
    return { accessToken, refreshToken, expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS };
  }
  /** Verify an access token; returns the session or undefined if unknown/expired. */
  verifyAccess(token: string): Session | undefined {
    const s = this.sessions.get(token);
    if (!s) return undefined;
    if (s.expiresAt <= this.now()) {
      this.sessions.delete(token);
      return undefined;
    }
    return s;
  }
  /** Revoke an access token immediately (RFC 7009 / OAuth /revoke). Idempotent:
   *  deleting an unknown token is a no-op, as the spec requires. */
  revokeAccess(token: string): void {
    this.sessions.delete(token);
  }
  /** Revoke a refresh token immediately (RFC 7009 / OAuth /revoke). Idempotent. */
  revokeRefresh(token: string): void {
    this.refresh.delete(token);
  }
  /** Consume a refresh token (rotated: removed on use). Past the CHAIN's absolute
   *  lifetime it is rejected, so a leaked token can't refresh forever. Returns
   *  `createdAt` (the chain's original issuance time) so the caller can preserve
   *  it through rotation rather than resetting the clock. */
  takeRefresh(
    token: string,
  ): { homeAccountId: string; clientId: string; scopes: string[]; createdAt: number } | undefined {
    const r = this.refresh.get(token);
    if (!r) return undefined;
    this.refresh.delete(token);
    return this.now() - r.createdAt > REFRESH_TOKEN_TTL_SECONDS ? undefined : r;
  }

  /**
   * Drop every entry past its TTL. Lazy expiry only fires when the same key is
   * re-presented, so abandoned auth flows / unconsumed codes / never-reused
   * tokens would otherwise accumulate forever in a long-lived instance (a slow
   * leak and a cheap DoS via repeated /authorize). Call periodically.
   */
  sweep(): void {
    const t = this.now();
    for (const [k, v] of this.pending) if (t - v.createdAt > CODE_TTL_SECONDS) this.pending.delete(k);
    for (const [k, v] of this.codes) if (t - v.createdAt > CODE_TTL_SECONDS) this.codes.delete(k);
    for (const [k, v] of this.sessions) if (v.expiresAt <= t) this.sessions.delete(k);
    for (const [k, v] of this.refresh) if (t - v.createdAt > REFRESH_TOKEN_TTL_SECONDS) this.refresh.delete(k);
    for (const [k, v] of this.clients) if (t - (v.client_id_issued_at ?? 0) > CLIENT_TTL_SECONDS) this.clients.delete(k);
  }
}
