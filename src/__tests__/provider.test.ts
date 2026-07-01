import { InvalidRequestError, InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { EntraOAuthProvider, entraErrorFields, type EntraConfig } from '../remote/provider.js';

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

  it('exchangeAuthorizationCode: a mismatched client is rejected WITHOUT burning the code', async () => {
    const provider = new EntraOAuthProvider({ entra: makeEntraConfig(), publicBaseUrl: PUBLIC_URL });
    // Seed a code bound to client "c1".
    const code = provider.clientsStore.issueCode({
      mcpClientId: 'c1',
      mcpCodeChallenge: 'chal',
      homeAccountId: 'home1',
    });
    const wrongClient = { client_id: 'attacker', redirect_uris: [] } as never;
    const rightClient = { client_id: 'c1', redirect_uris: [] } as never;

    // Wrong client → invalid_grant, and the code must survive (peek → check → take).
    await expect(provider.exchangeAuthorizationCode(wrongClient, code)).rejects.toThrow('invalid_grant');
    expect(provider.clientsStore.peekCode(code)?.homeAccountId).toBe('home1');

    // The legitimate client can then still exchange it; afterwards it's consumed.
    const tokens = await provider.exchangeAuthorizationCode(rightClient, code);
    expect(tokens.access_token).toBeTruthy();
    expect(provider.clientsStore.peekCode(code)).toBeUndefined();
  });

  it('exchangeRefreshToken: a mismatched client is rejected WITHOUT burning the token', async () => {
    const provider = new EntraOAuthProvider({ entra: makeEntraConfig(), publicBaseUrl: PUBLIC_URL });
    const { refreshToken } = provider.clientsStore.issueTokens('c1', 'home1', ['openid']);
    const wrongClient = { client_id: 'attacker', redirect_uris: [] } as never;
    const rightClient = { client_id: 'c1', redirect_uris: [] } as never;

    await expect(provider.exchangeRefreshToken(wrongClient, refreshToken)).rejects.toThrow('invalid_grant');
    expect(provider.clientsStore.peekRefresh(refreshToken)?.homeAccountId).toBe('home1');

    const tokens = await provider.exchangeRefreshToken(rightClient, refreshToken);
    expect(tokens.access_token).toBeTruthy();
    expect(provider.clientsStore.peekRefresh(refreshToken)).toBeUndefined();
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

describe('entraErrorFields', () => {
  it('keeps only non-PII codes and never leaks a UPN-bearing MSAL message', () => {
    const err = Object.assign(
      new Error("AADSTS50020: User account 'jane.doe@webmed.no' from identity provider does not exist in tenant"),
      { name: 'ServerError', errorCode: 'invalid_grant' },
    );
    const fields = entraErrorFields(err);
    expect(fields).toEqual({ errorName: 'ServerError', errorCode: 'invalid_grant', aadsts: 'AADSTS50020' });
    // The UPN in the message must not survive into the log fields.
    expect(JSON.stringify(fields)).not.toContain('jane.doe@webmed.no');
    expect(JSON.stringify(fields)).not.toContain('User account');
  });

  it('extracts the AADSTS code for a bad client secret', () => {
    const err = Object.assign(new Error('AADSTS7000215: Invalid client secret provided.'), {
      name: 'ClientAuthError',
      errorCode: 'invalid_client',
    });
    expect(entraErrorFields(err)).toEqual({
      errorName: 'ClientAuthError',
      errorCode: 'invalid_client',
      aadsts: 'AADSTS7000215',
    });
  });

  it('handles non-Error values without throwing or leaking', () => {
    expect(entraErrorFields('boom')).toEqual({});
    expect(entraErrorFields(null)).toEqual({});
    expect(entraErrorFields(new Error('plain failure, no codes'))).toEqual({ errorName: 'Error' });
  });
});
