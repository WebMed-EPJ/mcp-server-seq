import { SignJWT, generateKeyPair, type KeyLike } from 'jose';
import {
  createGitHubOidcVerifier,
  loadGitHubOidcConfig,
  githubOidcAllowListEmpty,
  DEFAULT_GITHUB_OIDC_ISSUER,
  type GitHubOidcConfig,
} from '../remote/github-oidc.js';

const ISS = DEFAULT_GITHUB_OIDC_ISSUER;
const AUD = 'https://seq-mcp.public.webmedepj.no';
const REPO = 'WebMed-EPJ/epj';
const OWNER = 'WebMed-EPJ';

const CONFIG: GitHubOidcConfig = {
  issuer: ISS,
  audience: AUD,
  allowedRepositories: [REPO],
  allowedOwners: [],
  allowedSubjects: [],
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
  sub?: string;
  repository?: string;
  repository_owner?: string;
  expSeconds?: number;
  key?: KeyLike;
  alg?: string;
}

async function signToken(claims: Claims = {}): Promise<string> {
  const {
    iss = ISS,
    aud = AUD,
    sub = 'repo:WebMed-EPJ/epj:ref:refs/heads/main',
    repository = REPO,
    repository_owner = OWNER,
    expSeconds,
    key = privateKey,
    alg = 'RS256',
  } = claims;
  const payload: Record<string, unknown> = { sub };
  if (repository !== undefined) payload.repository = repository;
  if (repository_owner !== undefined) payload.repository_owner = repository_owner;
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg, kid: 'test-key' })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt();
  jwt.setExpirationTime(expSeconds ? new Date(expSeconds * 1000) : '10m');
  return jwt.sign(key);
}

function verifier(cfg: GitHubOidcConfig = CONFIG) {
  return createGitHubOidcVerifier(cfg, publicKey);
}

describe('loadGitHubOidcConfig', () => {
  const KEYS = [
    'GITHUB_OIDC_ENABLED',
    'GITHUB_OIDC_AUDIENCE',
    'GITHUB_OIDC_ISSUER',
    'GITHUB_OIDC_ALLOWED_REPOSITORIES',
    'GITHUB_OIDC_ALLOWED_OWNERS',
    'GITHUB_OIDC_ALLOWED_SUBJECTS',
  ] as const;
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

  it('is disabled (null) when GITHUB_OIDC_ENABLED is unset', () => {
    delete process.env.GITHUB_OIDC_ENABLED;
    expect(loadGitHubOidcConfig()).toBeNull();
  });

  it('is disabled (null) when GITHUB_OIDC_ENABLED is falsy', () => {
    process.env.GITHUB_OIDC_ENABLED = 'false';
    expect(loadGitHubOidcConfig()).toBeNull();
  });

  it('fails closed when enabled but GITHUB_OIDC_AUDIENCE is missing', () => {
    process.env.GITHUB_OIDC_ENABLED = 'true';
    delete process.env.GITHUB_OIDC_AUDIENCE;
    expect(() => loadGitHubOidcConfig()).toThrow(/GITHUB_OIDC_AUDIENCE/);
  });

  it('loads config with the default issuer and parsed allow-lists', () => {
    process.env.GITHUB_OIDC_ENABLED = 'true';
    process.env.GITHUB_OIDC_AUDIENCE = AUD;
    delete process.env.GITHUB_OIDC_ISSUER;
    process.env.GITHUB_OIDC_ALLOWED_REPOSITORIES = `${REPO}, WebMed-EPJ/other`;
    process.env.GITHUB_OIDC_ALLOWED_OWNERS = OWNER;
    process.env.GITHUB_OIDC_ALLOWED_SUBJECTS = 'repo:WebMed-EPJ/epj:*';
    expect(loadGitHubOidcConfig()).toEqual({
      issuer: DEFAULT_GITHUB_OIDC_ISSUER,
      audience: AUD,
      allowedRepositories: [REPO, 'WebMed-EPJ/other'],
      allowedOwners: [OWNER],
      allowedSubjects: ['repo:WebMed-EPJ/epj:*'],
    });
  });

  it('allows a GITHUB_OIDC_ISSUER override (GHES)', () => {
    process.env.GITHUB_OIDC_ENABLED = '1';
    process.env.GITHUB_OIDC_AUDIENCE = AUD;
    process.env.GITHUB_OIDC_ISSUER = 'https://ghes.example.com/_services/token';
    const cfg = loadGitHubOidcConfig();
    expect(cfg?.issuer).toBe('https://ghes.example.com/_services/token');
  });

  it('loads (does NOT throw) with an empty allow-list — verifier default-denies', () => {
    process.env.GITHUB_OIDC_ENABLED = 'true';
    process.env.GITHUB_OIDC_AUDIENCE = AUD;
    delete process.env.GITHUB_OIDC_ALLOWED_REPOSITORIES;
    delete process.env.GITHUB_OIDC_ALLOWED_OWNERS;
    delete process.env.GITHUB_OIDC_ALLOWED_SUBJECTS;
    const cfg = loadGitHubOidcConfig();
    expect(cfg).not.toBeNull();
    expect(githubOidcAllowListEmpty(cfg!)).toBe(true);
  });
});

describe('createGitHubOidcVerifier', () => {
  it('accepts a valid token whose repository is allow-listed', async () => {
    const info = await verifier()(await signToken());
    expect(info).not.toBeNull();
    expect(info!.clientId).toBe(`github:${REPO}`);
    expect(info!.extra).toMatchObject({ github: true, repository: REPO, repositoryOwner: OWNER });
  });

  it('accepts via the owner allow-list', async () => {
    const cfg: GitHubOidcConfig = { ...CONFIG, allowedRepositories: [], allowedOwners: [OWNER] };
    expect(await verifier(cfg)(await signToken())).not.toBeNull();
  });

  it('accepts via a subject glob', async () => {
    const cfg: GitHubOidcConfig = { ...CONFIG, allowedRepositories: [], allowedSubjects: ['repo:WebMed-EPJ/epj:*'] };
    const token = await signToken({ sub: 'repo:WebMed-EPJ/epj:ref:refs/heads/feature' });
    expect(await verifier(cfg)(token)).not.toBeNull();
  });

  it('rejects a wrong audience', async () => {
    const token = await signToken({ aud: 'https://some-other-resource.example' });
    expect(await verifier()(token)).toBeNull();
  });

  it('falls through (null) for a non-GitHub issuer', async () => {
    // A different issuer is NOT a GitHub token — the verifier must self-gate and
    // return null so the Entra/user paths still get a shot.
    const token = await signToken({ iss: 'https://login.microsoftonline.com/tid/v2.0' });
    expect(await verifier()(token)).toBeNull();
  });

  it('rejects a disallowed repository', async () => {
    const token = await signToken({ repository: 'WebMed-EPJ/not-allowed', repository_owner: OWNER });
    const cfg: GitHubOidcConfig = { ...CONFIG, allowedOwners: [] };
    expect(await verifier(cfg)(token)).toBeNull();
  });

  it('rejects a disallowed subject when only subjects are configured', async () => {
    const cfg: GitHubOidcConfig = {
      ...CONFIG,
      allowedRepositories: [],
      allowedSubjects: ['repo:WebMed-EPJ/epj:ref:refs/heads/main'],
    };
    // Glob is exact-anchored: a different ref must not match.
    const token = await signToken({ sub: 'repo:WebMed-EPJ/epj:ref:refs/heads/other', repository: 'x/y', repository_owner: 'x' });
    expect(await verifier(cfg)(token)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signToken({ expSeconds: 1000 });
    expect(await verifier()(token)).toBeNull();
  });

  it('rejects a token signed by a different key', async () => {
    const other = await generateKeyPair('RS256');
    const token = await signToken({ key: other.privateKey });
    expect(await verifier()(token)).toBeNull();
  });

  it('returns null for a non-JWT (opaque user token falls through)', async () => {
    expect(await verifier()('opaque-token-value')).toBeNull();
  });

  it('returns null for a malformed JWT-shaped string', async () => {
    expect(await verifier()('aaa.bbb.ccc')).toBeNull();
  });

  it('fails closed when the allow-list is empty (valid signature, still rejected)', async () => {
    const cfg: GitHubOidcConfig = { ...CONFIG, allowedRepositories: [], allowedOwners: [], allowedSubjects: [] };
    expect(await verifier(cfg)(await signToken())).toBeNull();
  });
});
