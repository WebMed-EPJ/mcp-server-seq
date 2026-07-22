# Seq MCP Server

MCP Server for Seq's API endpoints for interacting with your logging and monitoring system. This server provides comprehensive access to Seq's API features through the Model Context Protocol.

<a href="https://glama.ai/mcp/servers/yljb00fc2g"><img width="380" height="200" src="https://glama.ai/mcp/servers/yljb00fc2g/badge" alt="Seq Server MCP server" /></a>

## Features

### Tools

#### Signals Management
- `get_signals` - Fetch signals with filtering options
  - Filter by owner ID
  - Filter shared/private signals
  - Support for partial matches

#### Event Management
- `get_events` - Retrieve events with extensive filtering options
  - Filter by signal IDs
  - Custom filter expressions
  - Configurable event count (max 50)
  - Flexible time range options
  - Date range filtering

#### Querying & Aggregation
- `sql_query` - Run a [Seq SQL-style query](https://datalust.co/docs/sql-queries) for aggregations and tabular analysis
  - Aggregate operators: `count`, `sum`, `mean`, `percentile`, `distinct`
  - `group by` breakdowns and `time(<n><unit>)` time-slicing
  - Scope to signals; flexible/relative time range (defaults to last 24h)
  - Use this instead of `get_events` for counts/rollups — the aggregation runs
    server-side rather than pulling raw rows and counting client-side
  - Example: `select RequestPath, count(*) from stream where StatusCode >= 500 group by RequestPath order by count(*) desc limit 20`

#### Alert Management
- `get_alert_state` - Retrieve the current state of alerts

### Resources

#### Signals Listing
- `signals` - List all shared signals with detailed information
  - Signal ID
  - Title
  - Description
  - Sharing status
  - Owner information

## Configuration

The server requires the following environment variables:

- `SEQ_BASE_URL` (optional): Your Seq server URL (defaults to 'http://localhost:8080')
- `SEQ_API_KEY` (required): Your Seq API key
- `SEQ_REDACTION_ENABLED` (optional): Set to `false` to disable PII redaction (defaults to enabled)

## Privacy / PII Redaction

All log data returned from Seq (events, signals, alert state and `sql_query`
results) is passed through a redaction step before it leaves the server, so
personal data is masked by default. Because a `sql_query` can `select` arbitrary
columns — including `@Properties` that may carry fødselsnummer, names or emails —
the entire rowset is redacted, not just event messages. This matters when logs may contain personal data — e.g. in
a healthcare/EPJ context where GDPR/Personvern applies.

Masked data types:

- **Norwegian national identity numbers** — fødselsnummer, D-numbers,
  H-numbers and FH-numbers, validated with date and MOD11 checks (matched in
  both string and numeric fields; numeric values that lost a leading zero are
  padded and re-checked)
- **Person names** — best-effort (see limitations below)
- **Email addresses** (reserved example/test domains such as `example.com`
  are intentionally treated as non-PII)
- **Phone numbers** — Norwegian formats including `+47`/`0047`, space-grouped
  numbers and bare mobile numbers (prefix 4 or 9)

### Limitations

- **Names are best-effort.** Names are matched against a curated dictionary of
  common Norwegian first names and surnames, so names outside that list are not
  masked (extend the dictionary in `src/redact.ts` as needed). Dictionary
  entries that are also common words/log tokens (e.g. "Else", "Per", "Berg")
  are only masked when part of a multi-token name (e.g. "Per Berg"), to avoid
  corrupting logs — so such a name appearing alone is not masked. Fødselsnummer
  (the strongest identifier) is masked reliably; do not rely on name masking
  alone as your only safeguard for free-text fields.
- **Phone over-redaction.** Bare 8-digit numbers starting with 4 or 9 are
  treated as mobile numbers, so an unrelated 8-digit value in a string (e.g.
  an order id) starting with those digits may be masked as a phone number.
  This is a deliberate privacy-first trade-off.

Redaction is built on the [`openredaction`](https://www.npmjs.com/package/openredaction)
library (for email) plus Norwegian-tuned custom patterns (fødselsnummer/D-/H-/
FH-number, phone, name). It runs **entirely in-process** — no audit backend,
metrics exporter, webhook or other network feature is enabled, so log content
never leaves the server. Replacements are deterministic placeholders (e.g.
`[FNR_1234]`, `[NAME_5678]`), so the same value maps to the same placeholder
within a response. Non-personal numeric fields such as status codes, durations
and timestamps are preserved to keep logs useful for debugging.

> **Note on the openredaction library.** Its English-centric context-analysis
> confidence model can silently drop detections in non-English text — notably
> when a segment contains a delimiter such as a semicolon (upstream issue
> [#26](https://github.com/sam247/openredaction/issues/26), unfixed in the
> latest published version). As a workaround, `redactText` splits input on
> delimiters that no supported PII type spans (`;`, `|`, line breaks, tabs) and
> redacts each segment independently. This is a mitigation, not a guarantee; if
> stronger assurances are required, consider replacing the library with a fully
> in-house deterministic matcher.

Set `SEQ_REDACTION_ENABLED=false` to turn redaction off (e.g. for local
debugging against a Seq instance with no real personal data).

## seq-ops Skill

This repo includes a Claude skill for Seq log analysis and incident investigation. Once the MCP server is connected, the skill guides Claude through structured investigations — health checks, incident triage, post-deployment monitoring — and produces consistent, actionable reports.

**Install the skill:**
```bash
# From the releases page, download seq-ops.skill, then:
claude skill install seq-ops.skill
```

Or install directly from this repo:
```bash
npx skills add ahmad2x4/mcp-server-seq
```

The skill automatically activates when you ask things like "morning health check", "something is broken in prod", "check the logs for timeouts", or "investigate the PPSR integration".

---

## Usage with Claude Code

Run the following command to add the server:

```bash
claude mcp add --transport stdio \
  --env SEQ_BASE_URL=http://localhost:5341 \
  --env SEQ_API_KEY=your-api-key \
  seq -- npx -y mcp-seq
```

To share the configuration with your team, use the `--scope project` flag (saves to `.mcp.json`):

```bash
claude mcp add --transport stdio --scope project \
  --env SEQ_BASE_URL=http://localhost:5341 \
  --env SEQ_API_KEY=your-api-key \
  seq -- npx -y mcp-seq
```

> **Windows users:** Replace `npx -y mcp-seq` with `cmd /c npx -y mcp-seq` to avoid "Connection closed" errors.

Verify the server is connected by running `/mcp` inside Claude Code.

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "seq": {
      "command": "npx",
      "args": ["-y", "mcp-seq"],
      "env": {
        "SEQ_BASE_URL": "your-seq-url",
        "SEQ_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Remote (hosted) HTTP server + Docker

In addition to the stdio transport above, the server ships a **remote HTTP entry
point** (`src/remote.ts`) that exposes the same tools as an OAuth-protected
**Streamable HTTP** MCP server, packaged as a Docker image. Use this to host the
connector centrally (e.g. for Claude Team / claude.ai) instead of running it
locally per user.

### Authentication

Access to the `/mcp` endpoint is validated per bearer token by a **dual-issuer**
gate, so one endpoint serves both interactive users and unattended automation:

- **Microsoft Entra OAuth 2.1** (dynamic client registration + PKCE) — the same
  sign-in model as the WebMed Lime/m365 connectors, for interactive clients
  (claude.ai). This is the default and only path unless the others are opted in.
- **GitHub Actions OIDC** — a keyless path for unattended GitHub Actions / gh-aw
  runs, which present a GitHub Actions OIDC JWT directly as the bearer (see
  [GitHub Actions OIDC](#github-actions-oidc-auth-keyless-automation) below).
- **Entra app-only (client-credentials)** — for other headless callers such as
  Claude-in-Slack (see [Machine-to-machine auth](#machine-to-machine-auth-headless-callers)).

Each incoming bearer is routed by its `iss`: a GitHub-issued token is validated
against GitHub's JWKS + claim allow-list, and everything else falls through to
the Entra paths. In every case sign-in only **authenticates** the caller; the
Seq API key stays **global and server-side** (there is no per-user Seq token).
Every authenticated caller is served by the same Seq client, and every log
response is still PII-redacted (see [Privacy](#privacy--pii-redaction)) before it
leaves the process.

Endpoints: `/healthz` (unauthenticated liveness), the OAuth metadata/`/authorize`/
`/token`/`/revoke`/`/register` routes, `/callback` (Entra redirect), and `/mcp`
(bearer-protected; `POST` only, `GET`/`DELETE` → `405`).

### Configuration (remote server)

In addition to `SEQ_BASE_URL` / `SEQ_API_KEY` (the remote server **requires**
`SEQ_API_KEY` and refuses to start without it), the remote entry point needs:

| Variable | Required | Description |
| --- | --- | --- |
| `REMOTE_PUBLIC_URL` | yes | Public **https** origin clients reach (e.g. `https://seq-mcp.webmed.no`). The OAuth metadata and the Entra redirect URI (`<origin>/callback`) are derived from it. |
| `TENANT_ID` | yes | Microsoft Entra tenant (WebMed). |
| `CLIENT_ID` | yes | Entra app registration (confidential client). |
| `CLIENT_SECRET` | yes | Client secret for the `/callback` exchange. |
| `ENTRA_SCOPES` | no | Sign-in scopes, space-separated. Default OIDC only: `openid profile email offline_access` (no Graph). |
| `PORT` | no | Listen port (plain HTTP — terminate TLS in front). Default `8790`. |
| `TRUST_PROXY_HOPS` | no | Reverse-proxy hop count for client-IP rate-limiting. Default `1`. Never set higher than the real hop count. |
| `MAX_JSON_BODY` | no | Max `/mcp` request body. Default `1mb`. |
| `SEQ_LOG_LEVEL` | no | `debug`/`info`/`warn`/`error`/`silent`. Default `info`. Logs to stderr; never logs the API key, bodies or PII. |
| `ENTRA_ALLOWED_CLIENT_IDS` | no | **Opt-in switch for machine-to-machine auth.** Comma/space-separated Entra app (client) IDs allowed to call `/mcp` with an app-only token (the token `azp`/`appid`). Unset = interactive-user login only. |
| `ENTRA_AUDIENCE` | if M2M | Acceptable token audience(s) — set **both** this API app's Application ID URI (`api://…`) and its client-id GUID. Required when `ENTRA_ALLOWED_CLIENT_IDS` is set (fail-closed). |
| `ENTRA_REQUIRED_ROLE` | no | App role the token must carry in `roles`. Default `Connector.Access`. |
| `GITHUB_OIDC_ENABLED` | no | **Opt-in switch for GitHub Actions OIDC auth** (keyless). `true`/`1`/`yes`/`on` to enable. Default `false`. |
| `GITHUB_OIDC_AUDIENCE` | if OIDC | Expected token `aud`, enforced strictly. Must equal what the caller sends (gh-aw's `auth.audience` defaults to the server URL — set both to e.g. `https://seq-mcp.public.webmedepj.no`). Required when `GITHUB_OIDC_ENABLED` (fail-closed). |
| `GITHUB_OIDC_ALLOWED_REPOSITORIES` | no | Comma/space-separated `repository` claims allowed, e.g. `WebMed-EPJ/epj`. |
| `GITHUB_OIDC_ALLOWED_OWNERS` | no | Comma/space-separated `repository_owner` claims allowed, e.g. `WebMed-EPJ`. **Broad:** this trusts *every* repository under that owner — prefer `GITHUB_OIDC_ALLOWED_REPOSITORIES` / `_SUBJECTS` as the tighter-scoped default, and reserve owner-level for when the whole org is trusted. |
| `GITHUB_OIDC_ALLOWED_SUBJECTS` | no | Comma/space-separated `sub` glob patterns (`*`/`?`), e.g. `repo:WebMed-EPJ/epj:*`. |
| `GITHUB_OIDC_ISSUER` | no | Override the expected issuer (default `https://token.actions.githubusercontent.com`; for GHES later). |

> **Default-deny:** when `GITHUB_OIDC_ENABLED` is true but **none** of the three
> allow-lists is set, every GitHub token is rejected (fail-closed) and a startup
> warning is logged. Configure at least one of repositories / owners / subjects.

Register the Entra app as a **confidential** client with a **Web** redirect URI
of `<REMOTE_PUBLIC_URL>/callback` and a client secret. See `.env.example` for a
copyable template.

### Machine-to-machine auth (headless callers)

The interactive OAuth login can't run headless (e.g. Claude triggered from
Slack). For that, a caller connects with an **"OAuth 2.0 client credentials"**
credential: it exchanges its own `client_id` + secret at a **token URL** for a
short-lived token (RFC 6749 §4.4) and sends it as the `/mcp` bearer. Point that
token URL at **Microsoft Entra** — the caller has its own Entra app, granted an
**app role** (`Connector.Access` by default) on this API's app registration — so
the client-credentials grant happens at Entra, not here. This server only
**validates** the resulting app-only JWT (signature via Entra JWKS, issuer,
audience, the required app role, and an `azp`/`appid` allow-list) in
`src/remote/service-auth.ts`; it mints no secret. Enable it by setting
`ENTRA_ALLOWED_CLIENT_IDS` (+ `ENTRA_AUDIENCE`); leave unset for interactive-only.
Every response stays PII/fnr-redacted regardless of caller. Prerequisites on the
API app: an **Application ID URI** and an **app role** the caller app is assigned.

### GitHub Actions OIDC auth (keyless automation)

Unattended **GitHub Actions** workflows — specifically our **GitHub Agentic
Workflows (gh-aw)** runs — can't run the interactive browser login and don't hold
an Entra app secret. Instead, gh-aw's MCP gateway obtains a **GitHub Actions OIDC
token** (a short-lived JWT minted by GitHub for the running workflow) and sends it
**verbatim** as the `/mcp` bearer. There is no Entra exchange, so this server
validates the raw GitHub token itself, as a resource server:

1. **Signature** — verified against GitHub's JWKS (`<issuer>/.well-known/jwks`,
   discovered from the OIDC issuer), cached with key-rotation handling (via
   `jose`'s `createRemoteJWKSet`). `alg` is pinned to `RS256`; an unsigned /
   `alg: none` token can never validate.
2. **Standard claims** — `iss` must equal the configured GitHub issuer exactly;
   `exp`/`nbf`/`iat` must be valid (60s clock skew); and `aud` must equal
   `GITHUB_OIDC_AUDIENCE` **exactly** — a token minted for a different audience is
   rejected.
3. **Claim allow-list** (the security gate) — the token is accepted only if its
   `repository` ∈ `GITHUB_OIDC_ALLOWED_REPOSITORIES`, **or** its
   `repository_owner` ∈ `GITHUB_OIDC_ALLOWED_OWNERS`, **or** its `sub` matches a
   glob in `GITHUB_OIDC_ALLOWED_SUBJECTS`. Anything else is rejected (`401`). With
   **no** allow-list configured the path default-denies (fail-closed).

Enable it with `GITHUB_OIDC_ENABLED=true` (+ `GITHUB_OIDC_AUDIENCE` and at least
one allow-list). Implemented in `src/remote/github-oidc.ts`; it mints no secret,
never logs the token, and every response stays PII/fnr-redacted regardless of
caller. Full tokens are never logged (only PII-free `repository`/`owner`/`sub`
identifiers on a rejection, for triage).

**How to call this from GitHub Actions / gh-aw.** In the workflow, grant the job
`permissions: { id-token: write }` so GitHub will mint an OIDC token, and point
the MCP client at the hosted URL with the audience set to match
`GITHUB_OIDC_AUDIENCE`. For gh-aw, `auth.audience` defaults to the MCP server
**url**, so keep both sides equal — e.g. server `GITHUB_OIDC_AUDIENCE` and gh-aw
`auth.audience` both set to `https://seq-mcp.public.webmedepj.no`. gh-aw acquires
the OIDC JWT for that audience and sends it as `Authorization: Bearer <jwt>`;
this server validates issuer + audience + the repository/owner/subject allow-list
before serving the shared, redacting Seq tools.

### Build & run with Docker

```bash
# Build (from the repo root)
docker build -t webmed-seq-connector .

# Run (terminate TLS in front; REMOTE_PUBLIC_URL is the public https origin)
docker run --rm -p 8790:8790 \
  -e REMOTE_PUBLIC_URL=https://seq-mcp.webmed.no \
  -e TENANT_ID=… -e CLIENT_ID=… -e CLIENT_SECRET=… \
  -e SEQ_BASE_URL=https://seq.internal.webmed.no \
  -e SEQ_API_KEY=… \
  webmed-seq-connector
```

The image is a multi-stage build (compile TypeScript, then a slim prod-only Node
runtime) and includes a `HEALTHCHECK` against `/healthz`. Deployment notes: the
process speaks plain HTTP — put a TLS-terminating ingress in front and set
`REMOTE_PUBLIC_URL` to the public https origin. OAuth state is kept **in-memory**,
so run a **single instance** (for HA, back the token store with a shared store —
see `src/remote/stores.ts`).

### Run the remote server without Docker

```bash
REMOTE_PUBLIC_URL=https://seq-mcp.webmed.no \
TENANT_ID=… CLIENT_ID=… CLIENT_SECRET=… \
SEQ_BASE_URL=https://seq.internal.webmed.no SEQ_API_KEY=… \
npm run start:remote
```

> The stdio bundle (`build/seq-server.js`, consumed by the `seq-ops` Claude Code
> plugin) is **unchanged** by this and stays dependency-free — `express` and
> `@azure/msal-node` are only pulled in by the remote entry point.

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run dev
```

Run tests:
```bash
npm run test-script
```

## Time Range Options

The `get_events` and `sql_query` tools support the following relative time range
options (`sql_query` defaults to `1d` / last 24h when none is given):
- `1m` - Last minute
- `15m` - Last 15 minutes
- `30m` - Last 30 minutes
- `1h` - Last hour
- `2h` - Last 2 hours
- `6h` - Last 6 hours
- `12h` - Last 12 hours
- `1d` - Last day
- `7d` - Last 7 days
- `14d` - Last 14 days
- `30d` - Last 30 days

## Installation

Install globally via npm:

```bash
npm install -g mcp-seq
```

Or use directly with `npx` — no installation required (as shown in the configuration examples above).

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. The server implements proper error handling and logging for all operations. You can run the test script to verify functionality:

```bash
npm run test-script
```
## Type Safety

The server implements comprehensive type safety using:
- TypeScript for static type checking
- Zod schema validation for runtime type checking
- Proper error handling and response formatting
