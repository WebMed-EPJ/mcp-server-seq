import {
  OAuthStore,
  ACCESS_TOKEN_TTL_SECONDS,
  CODE_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  CLIENT_TTL_SECONDS,
} from '../remote/stores.js';

// Deterministic store: fixed clock + counter token generator.
function makeStore() {
  let clock = 1_000;
  let n = 0;
  const store = new OAuthStore(
    () => clock,
    () => `tok${n++}`,
  );
  return { store, tick: (s: number) => (clock += s), at: () => clock };
}

describe('OAuthStore', () => {
  it('registerClient assigns a client_id when missing and getClient round-trips', () => {
    const { store } = makeStore();
    const reg = store.registerClient({ client_id: '', redirect_uris: ['https://claude.ai/cb'] });
    expect(reg.client_id).toBeTruthy();
    expect(store.getClient(reg.client_id)?.client_id).toBe(reg.client_id);
    expect(store.getClient('nope')).toBeUndefined();
  });

  it('authorization code is one-time and PKCE-peekable before exchange', () => {
    const { store } = makeStore();
    const code = store.issueCode({ mcpClientId: 'c1', mcpCodeChallenge: 'chal', homeAccountId: 'home1' });
    // challengeForAuthorizationCode peeks (does not consume)
    expect(store.peekCode(code)?.mcpCodeChallenge).toBe('chal');
    expect(store.peekCode(code)?.homeAccountId).toBe('home1');
    // exchange consumes it
    expect(store.takeCode(code)?.homeAccountId).toBe('home1');
    expect(store.takeCode(code)).toBeUndefined();
    expect(store.peekCode(code)).toBeUndefined();
  });

  it('expired authorization codes are rejected', () => {
    const { store, tick } = makeStore();
    const code = store.issueCode({ mcpClientId: 'c1', mcpCodeChallenge: 'chal', homeAccountId: 'home1' });
    tick(CODE_TTL_SECONDS + 1);
    expect(store.peekCode(code)).toBeUndefined();
    expect(store.takeCode(code)).toBeUndefined();
  });

  it('pending Entra federation is one-time and time-limited', () => {
    const { store, tick } = makeStore();
    store.putPending('state1', {
      mcpClientId: 'c1',
      mcpRedirectUri: 'https://claude.ai/cb',
      mcpState: 'abc',
      mcpCodeChallenge: 'chal',
      entraVerifier: 'ver',
    });
    expect(store.takePending('state1')?.entraVerifier).toBe('ver');
    expect(store.takePending('state1')).toBeUndefined();

    store.putPending('state2', {
      mcpClientId: 'c1',
      mcpRedirectUri: 'https://claude.ai/cb',
      mcpCodeChallenge: 'chal',
      entraVerifier: 'ver',
    });
    tick(CODE_TTL_SECONDS + 1);
    expect(store.takePending('state2')).toBeUndefined();
  });

  it('issued access token verifies until expiry; refresh is rotated', () => {
    const { store, tick, at } = makeStore();
    const { accessToken, refreshToken, expiresInSeconds } = store.issueTokens('c1', 'home1', ['openid']);
    expect(expiresInSeconds).toBe(ACCESS_TOKEN_TTL_SECONDS);

    const s = store.verifyAccess(accessToken);
    expect(s?.homeAccountId).toBe('home1');
    expect(s?.clientId).toBe('c1');
    expect(s?.scopes).toEqual(['openid']);
    expect(s?.expiresAt).toBe(at() + ACCESS_TOKEN_TTL_SECONDS);

    // After expiry the access token no longer verifies.
    tick(ACCESS_TOKEN_TTL_SECONDS + 1);
    expect(store.verifyAccess(accessToken)).toBeUndefined();

    // Refresh token is single-use (rotated on consumption).
    expect(store.takeRefresh(refreshToken)?.homeAccountId).toBe('home1');
    expect(store.takeRefresh(refreshToken)).toBeUndefined();
  });

  it('refresh token is rejected past its absolute lifetime', () => {
    const { store, tick } = makeStore();
    const { refreshToken } = store.issueTokens('c1', 'home1', ['openid']);
    tick(REFRESH_TOKEN_TTL_SECONDS + 1);
    expect(store.takeRefresh(refreshToken)).toBeUndefined();
  });

  it("refresh rotation preserves the chain's absolute lifetime (clock not reset)", () => {
    const { store, tick } = makeStore(); // clock starts at 1000
    let { refreshToken } = store.issueTokens('c1', 'home1', ['s']); // createdAt = 1000
    const TEN_DAYS = 10 * 24 * 60 * 60;

    // Rotate every 10 days, threading the original createdAt back in (as the
    // provider does). The chain must still age out at the absolute 30-day cap.
    for (let i = 0; i < 3; i++) {
      tick(TEN_DAYS);
      const rec = store.takeRefresh(refreshToken);
      expect(rec).toBeTruthy();
      expect(rec!.createdAt).toBe(1000);
      refreshToken = store.issueTokens(rec!.clientId, rec!.homeAccountId, rec!.scopes, rec!.createdAt).refreshToken;
    }

    tick(1); // now 30 days + 1s past the original issuance
    expect(store.takeRefresh(refreshToken)).toBeUndefined();
  });

  it('revokeAccess/revokeRefresh drop tokens immediately and are idempotent', () => {
    const { store } = makeStore();
    const { accessToken, refreshToken } = store.issueTokens('c1', 'home1', ['openid']);

    store.revokeAccess(accessToken);
    expect(store.verifyAccess(accessToken)).toBeUndefined();

    store.revokeRefresh(refreshToken);
    expect(store.takeRefresh(refreshToken)).toBeUndefined();

    // Revoking an unknown/already-revoked token is a no-op (RFC 7009), not an error.
    expect(() => {
      store.revokeAccess(accessToken);
      store.revokeRefresh('never-issued');
    }).not.toThrow();
  });

  it('registerClient stamps client_id_issued_at and sweep() evicts aged-out clients', () => {
    const { store, tick } = makeStore();
    const stale = store.registerClient({ client_id: '', redirect_uris: ['https://claude.ai/cb'] });
    expect(stale.client_id_issued_at).toBeTruthy();
    tick(CLIENT_TTL_SECONDS + 1); // age the first client past the cap

    const live = store.registerClient({ client_id: '', redirect_uris: ['https://claude.ai/cb'] });
    store.sweep();

    expect(store.getClient(stale.client_id)).toBeUndefined();
    expect(store.getClient(live.client_id)?.client_id).toBe(live.client_id);
  });

  it('sweep() evicts expired pending/codes/sessions/refresh but keeps live ones', () => {
    const { store, tick } = makeStore();
    // Live entries created after the tick should survive the sweep.
    const staleCode = store.issueCode({ mcpClientId: 'c1', mcpCodeChallenge: 'x', homeAccountId: 'h' });
    const { accessToken: staleAccess } = store.issueTokens('c1', 'h', ['s']);
    tick(ACCESS_TOKEN_TTL_SECONDS + 1); // expire the above

    const liveCode = store.issueCode({ mcpClientId: 'c1', mcpCodeChallenge: 'y', homeAccountId: 'h' });
    const { accessToken: liveAccess } = store.issueTokens('c1', 'h', ['s']);

    store.sweep();

    expect(store.peekCode(staleCode)).toBeUndefined();
    expect(store.verifyAccess(staleAccess)).toBeUndefined();
    expect(store.peekCode(liveCode)?.mcpCodeChallenge).toBe('y');
    expect(store.verifyAccess(liveAccess)?.homeAccountId).toBe('h');
  });
});
