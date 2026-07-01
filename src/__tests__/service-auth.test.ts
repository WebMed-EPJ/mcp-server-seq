import { SignJWT, generateKeyPair, type KeyLike } from 'jose';
import {
  createServiceTokenVerifier,
  loadServiceAuthConfig,
  type ServiceAuthConfig,
} from '../remote/service-auth.js';

const TENANT = '1867233e-0000-0000-0000-000000000000';
const V2_ISS = `https://login.microsoftonline.com/${TENANT}/v2.0`;
const V1_ISS = `https://sts.windows.net/${TENANT}/`;
const AUD_URI = 'api://seq-mcp';
const AUD_GUID = 'aaaaaaaa-0000-0000-0000-000000000000';
const CALLER = 'cccccccc-0000-0000-0000-000000000000';

const CONFIG: ServiceAuthConfig = {
  tenantId: TENANT,
  audiences: [AUD_URI, AUD_GUID],
  requiredRole: 'Connector.Access',
  allowedClientIds: [CALLER],
};

let privateKey: KeyLike;
let publicKey: KeyLike;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  publicKey = pair.publicKey;
});

interface Claims {
  iss?: string;
  aud?: string;
  roles?: string[];
  azp?: string;
  appid?: string;
  scp?: string;
  expSeconds?: number;
}

async function signToken(claims: Claims): Promise<string> {
  const { iss = V2_ISS, aud = AUD_URI, roles, azp, appid, scp, expSeconds } = claims;
  const payload: Record<string, unknown> = {};
  if (roles) payload.roles = roles;
  if (azp) payload.azp = azp;
  if (appid) payload.appid = appid;
  if (scp) payload.scp = scp;
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt();
  jwt.setExpirationTime(expSeconds ? new Date(expSeconds * 1000) : '1h');
  return jwt.sign(privateKey);
}

function verifier() {
  return createServiceTokenVerifier(CONFIG, publicKey);
}

describe('loadServiceAuthConfig', () => {
  const KEYS = ['ENTRA_ALLOWED_CLIENT_IDS', 'ENTRA_AUDIENCE', 'ENTRA_REQUIRED_ROLE'] as const;
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => KEYS.forEach((k) => (saved[k] = process.env[k])));
  afterEach(() => {
    // Restore by DELETING keys that were originally unset — assigning `undefined`
    // would leave the literal string "undefined" and leak into later tests.
    KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  it('is disabled (null) when no allow-list is set', () => {
    delete process.env.ENTRA_ALLOWED_CLIENT_IDS;
    expect(loadServiceAuthConfig(TENANT)).toBeNull();
  });

  it('fails closed when allow-list is set but audience is missing', () => {
    process.env.ENTRA_ALLOWED_CLIENT_IDS = CALLER;
    delete process.env.ENTRA_AUDIENCE;
    expect(() => loadServiceAuthConfig(TENANT)).toThrow(/ENTRA_AUDIENCE/);
  });

  it('loads config with a default role', () => {
    process.env.ENTRA_ALLOWED_CLIENT_IDS = `${CALLER}, other-id`;
    process.env.ENTRA_AUDIENCE = `${AUD_URI} ${AUD_GUID}`;
    delete process.env.ENTRA_REQUIRED_ROLE;
    const cfg = loadServiceAuthConfig(TENANT);
    expect(cfg).toEqual({
      tenantId: TENANT,
      audiences: [AUD_URI, AUD_GUID],
      requiredRole: 'Connector.Access',
      allowedClientIds: [CALLER, 'other-id'],
    });
  });
});

describe('createServiceTokenVerifier', () => {
  it('accepts a valid app-only token (v2 issuer, App ID URI audience)', async () => {
    const token = await signToken({ roles: ['Connector.Access'], azp: CALLER });
    const info = await verifier()(token);
    expect(info).not.toBeNull();
    expect(info!.clientId).toBe(CALLER);
    expect(info!.scopes).toContain('Connector.Access');
    expect(info!.extra).toMatchObject({ service: true, homeAccountId: `service:${CALLER}` });
  });

  it('accepts the v1 issuer and the GUID audience, and reads appid when azp is absent', async () => {
    const token = await signToken({ iss: V1_ISS, aud: AUD_GUID, roles: ['Connector.Access'], appid: CALLER });
    const info = await verifier()(token);
    expect(info?.clientId).toBe(CALLER);
  });

  it('returns null for a non-JWT (opaque user token falls through)', async () => {
    expect(await verifier()('opaque-token-value')).toBeNull();
  });

  it('matches the caller GUID case-insensitively (mixed-case allow-list + token azp)', async () => {
    // Allow-list has an UPPERCASE GUID; token azp is lowercase — must still match.
    const cfg: ServiceAuthConfig = { ...CONFIG, allowedClientIds: [CALLER.toUpperCase()] };
    const token = await signToken({ roles: ['Connector.Access'], azp: CALLER });
    expect(await createServiceTokenVerifier(cfg, publicKey)(token)).not.toBeNull();
  });

  it('rejects a wrong audience', async () => {
    const token = await signToken({ aud: 'api://some-other-api', roles: ['Connector.Access'], azp: CALLER });
    expect(await verifier()(token)).toBeNull();
  });

  it('rejects a wrong issuer (different tenant)', async () => {
    const token = await signToken({
      iss: 'https://login.microsoftonline.com/99999999-0000-0000-0000-000000000000/v2.0',
      roles: ['Connector.Access'],
      azp: CALLER,
    });
    expect(await verifier()(token)).toBeNull();
  });

  it('rejects a token missing the required role', async () => {
    const token = await signToken({ roles: ['Some.Other.Role'], azp: CALLER });
    expect(await verifier()(token)).toBeNull();
  });

  it('rejects a token with no roles claim', async () => {
    const token = await signToken({ azp: CALLER });
    expect(await verifier()(token)).toBeNull();
  });

  it('rejects a caller that is not allow-listed', async () => {
    const token = await signToken({ roles: ['Connector.Access'], azp: 'dddddddd-0000-0000-0000-000000000000' });
    expect(await verifier()(token)).toBeNull();
  });

  it('rejects a delegated (user) token that carries scp', async () => {
    const token = await signToken({ roles: ['Connector.Access'], azp: CALLER, scp: 'user_impersonation' });
    expect(await verifier()(token)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signToken({ roles: ['Connector.Access'], azp: CALLER, expSeconds: 1000 });
    expect(await verifier()(token)).toBeNull();
  });

  it('rejects a token signed by a different key', async () => {
    const other = await generateKeyPair('RS256');
    const token = await new SignJWT({ roles: ['Connector.Access'], azp: CALLER })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(V2_ISS)
      .setAudience(AUD_URI)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(other.privateKey);
    expect(await verifier()(token)).toBeNull();
  });
});
