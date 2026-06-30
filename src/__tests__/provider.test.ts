import { InvalidRequestError, InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { EntraOAuthProvider, type EntraConfig } from '../remote/provider.js';

// Minimal confidential-client config; the MSAL client is constructed but never
// hits the network in these tests (no token acquisition is triggered).
function makeEntraConfig(): EntraConfig {
  // Not a real credential — assembled at runtime so there's no hard-coded secret
  // literal in source (the test only needs a truthy value to pick the
  // confidential-client path).
  const clientSecret = process.env.TEST_CLIENT_SECRET ?? ['test', 'only', 'dummy'].join('-');
  return {
    tenantId: '11111111-1111-1111-1111-111111111111',
    clientId: '22222222-2222-2222-2222-222222222222',
    clientSecret,
    scopes: ['openid', 'profile', 'offline_access'],
  };
}

const PUBLIC_URL = 'https://seq-mcp.example.test';

function makeRes() {
  const calls: { status?: number; sent?: string; redirect?: string } = {};
  const res = {
    status(code: number) {
      calls.status = code;
      return res;
    },
    send(body?: string) {
      calls.sent = body ?? '';
      return res;
    },
    redirect(url: string) {
      calls.redirect = url;
      return res;
    },
  };
  return { res: res as never, calls };
}

/** Replace the provider's private MSAL client with a stub. */
function stubMsal(provider: EntraOAuthProvider, acquireTokenByCode: () => Promise<unknown>) {
  (provider as unknown as { cca: { acquireTokenByCode: () => Promise<unknown> } }).cca = {
    acquireTokenByCode,
  };
}

function seedPending(provider: EntraOAuthProvider, state: string) {
  provider.clientsStore.putPending(state, {
    mcpClientId: 'c1',
    mcpRedirectUri: 'https://claude.ai/cb',
    mcpState: 'orig-state',
    mcpCodeChallenge: 'chal',
    entraVerifier: 'ver',
  });
}

describe('EntraOAuthProvider', () => {
  it('constructor requires a client secret (confidential client)', () => {
    expect(
      () =>
        new EntraOAuthProvider({
          entra: { ...makeEntraConfig(), clientSecret: '' },
          publicBaseUrl: PUBLIC_URL,
        }),
    ).toThrow(/CLIENT_SECRET/);
  });

  // Regression: an unknown/expired/previous-session bearer token MUST reject with
  // the SDK's InvalidTokenError, not a plain Error. requireBearerAuth maps a plain
  // Error to 500 server_error (fatal — the client gives up), but InvalidTokenError
  // to 401, which makes clients like mcp-remote drop the stale token and re-auth.
  it('verifyAccessToken rejects an unknown token with InvalidTokenError (→ 401, not 500)', async () => {
    const provider = new EntraOAuthProvider({ entra: makeEntraConfig(), publicBaseUrl: PUBLIC_URL });
    let caught: unknown;
    try {
      await provider.verifyAccessToken('a-token-from-a-previous-session');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(InvalidTokenError);
    // The middleware keys off the class to choose 401 over 500.
    expect((caught as InvalidTokenError).toResponseObject().error).toBe('invalid_token');
  });

  // Defense-in-depth against open redirect: authorize() must refuse a redirectUri
  // that the client never registered, rather than later res.redirect()ing to it.
  it('authorize rejects a redirect_uri not registered for the client', async () => {
    const provider = new EntraOAuthProvider({ entra: makeEntraConfig(), publicBaseUrl: PUBLIC_URL });
    const client = { client_id: 'c1', redirect_uris: ['https://claude.ai/cb'] } as never;
    const res = {
      redirect() {
        throw new Error('must not redirect to an unregistered URI');
      },
    } as never;
    const params = {
      redirectUri: 'https://evil.example/steal',
      codeChallenge: 'chal',
      state: 's',
      scopes: ['openid'],
    } as never;
    let caught: unknown;
    try {
      await provider.authorize(client, params, res);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(InvalidRequestError);
  });

  // --- handleEntraCallback: the redirect-back-to-claude.ai logic (most
  // security-sensitive in the provider). The MSAL client is private, so the tests
  // swap it for a stub and seed pending state through the public clientsStore. ---

  it('handleEntraCallback: unknown/expired state → 400 without redirecting', async () => {
    const provider = new EntraOAuthProvider({ entra: makeEntraConfig(), publicBaseUrl: PUBLIC_URL });
    const { res, calls } = makeRes();
    await provider.handleEntraCallback({ state: 'never-seeded', code: 'abc' }, res);
    expect(calls.status).toBe(400);
    expect(calls.redirect).toBeUndefined();
  });

  it('handleEntraCallback: success → redirects to the registered URI with code + original state, issuing a one-time code', async () => {
    const provider = new EntraOAuthProvider({ entra: makeEntraConfig(), publicBaseUrl: PUBLIC_URL });
    seedPending(provider, 'state1');
    stubMsal(provider, async () => ({ account: { homeAccountId: 'home-x' } }));

    const { res, calls } = makeRes();
    await provider.handleEntraCallback({ state: 'state1', code: 'entra-code' }, res);

    expect(calls.redirect).toBeTruthy();
    const url = new URL(calls.redirect!);
    expect(url.origin + url.pathname).toBe('https://claude.ai/cb');
    expect(url.searchParams.get('state')).toBe('orig-state');
    const code = url.searchParams.get('code');
    expect(code).toBeTruthy();
    // The issued code is real (peekable) and maps to the signed-in account.
    expect(provider.clientsStore.peekCode(code!)?.homeAccountId).toBe('home-x');
  });

  it('handleEntraCallback: Entra sign-in error → redirect with error=access_denied (no code issued)', async () => {
    const provider = new EntraOAuthProvider({ entra: makeEntraConfig(), publicBaseUrl: PUBLIC_URL });
    seedPending(provider, 'state1');
    const { res, calls } = makeRes();
    await provider.handleEntraCallback(
      { state: 'state1', error: 'access_denied', error_description: 'User cancelled' },
      res,
    );
    expect(calls.redirect).toBeTruthy();
    const url = new URL(calls.redirect!);
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.get('state')).toBe('orig-state');
    expect(url.searchParams.get('code')).toBeNull();
  });

  it('handleEntraCallback: Entra returns no account → redirect with error=server_error', async () => {
    const provider = new EntraOAuthProvider({ entra: makeEntraConfig(), publicBaseUrl: PUBLIC_URL });
    seedPending(provider, 'state1');
    stubMsal(provider, async () => ({ account: undefined }));
    const { res, calls } = makeRes();
    await provider.handleEntraCallback({ state: 'state1', code: 'entra-code' }, res);
    expect(calls.redirect).toBeTruthy();
    expect(new URL(calls.redirect!).searchParams.get('error')).toBe('server_error');
  });
});
