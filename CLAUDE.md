# MCP-SERVER-SEQ DEVELOPMENT GUIDE

## Build & Run Commands
- Build: `npm run build` (tsc emit, then esbuild bundles a self-contained `build/seq-server.js`)
- Bundle only: `npm run bundle` (esbuild → single-file `build/seq-server.js`)
- Start (stdio): `npm run start`
- Start (remote HTTP): `npm run start:remote` (tsc → `dist-server/`, then `node dist-server/remote.js`)
- Development: `npm run dev` (watch mode)
- Test (all unit tests): `npm test` (Jest)
- Run specific test: `npx jest src/__tests__/your-test-file.test.ts`
- Manual smoke test against a live Seq instance: `npm run test-script`

Requires Node.js >= 20 (see `engines` in package.json).

## Two entry points (stdio + remote HTTP)
- **`src/seq-server.ts`** — the **stdio** entry point. Thin: reads env, calls `createSeqServer()`,
  connects a `StdioServerTransport`. This is what gets esbuild-bundled into `build/seq-server.js`
  and run by the `claude-plugins` `seq-ops` plugin. Stays **dependency-free** (no express/msal).
- **`src/server.ts`** — `createSeqServer()`, the shared server factory: registers all tools/resources
  (`get_signals`, `get_events`, `get_alert_state`, `sql_query`, `signals` resource) and reads the
  `SEQ_BASE_URL`/`SEQ_API_KEY` upstream config. Both entry points use it, so they expose an identical
  tool surface and the same `redactDeep` PII guarantee.
- **`src/remote.ts`** — the **remote HTTP** entry point (Docker). Serves the same tools over an
  OAuth-protected **Streamable HTTP** `/mcp` endpoint (Express). Authorization is a full OAuth 2.1
  flow (DCR + PKCE) federated to **Microsoft Entra** — the same model as the WebMed Lime/m365
  connectors. Sign-in only AUTHENTICATES the caller; `SEQ_API_KEY` stays global + server-side. Ports
  the OAuth machinery verbatim: `src/remote/provider.ts` (`EntraOAuthProvider`), `src/remote/stores.ts`
  (in-memory token store; single-instance only), `src/remote-config.ts` (`loadRemoteConfig`), and a
  stderr-only `src/logger.ts`. Fails closed without `REMOTE_PUBLIC_URL`/`TENANT_ID`/`CLIENT_ID`/
  `CLIENT_SECRET`/`SEQ_API_KEY`. Endpoints: `/healthz` (unauth), OAuth metadata/`/authorize`/`/token`/
  `/revoke`/`/register`, `/callback`, `/mcp` (bearer; POST only, GET/DELETE → 405).
- **Dependency split:** `express` + `@azure/msal-node` are runtime deps used **only** by `remote.ts`.
  Because `seq-server.ts` → `server.ts` never imports them, the esbuild stdio bundle stays free of
  them. The Docker image compiles `src/` with `tsc` (`build:server`) and ships prod `node_modules`
  (`npm ci --omit=dev`) — it is NOT esbuild-bundled.
- **zod must be `^3.25`** (not `^3.24`): the SDK (`@modelcontextprotocol/sdk` `^1.29`) needs
  `zod ^3.25 || ^4.0`. With an older zod two copies install (project 3.x + the SDK's 4.x), and the
  `ZodRawShapeCompat` types in `server.tool(...)` blow up `tsc` (TS2589, multi-minute typecheck).
  Keep a single deduped zod 3.25.x (`npm dedupe` if the lock regresses).

## Docker (remote HTTP server)
`Dockerfile` builds the remote connector only (multi-stage: `tsc` → slim prod runtime, `node
dist-server/remote.js`, `HEALTHCHECK` on `/healthz`, default `PORT=8790`). `.dockerignore` excludes
`node_modules`/`build`/`dist-*`/`.env`. See `README.md` and `.env.example` for the env vars. The
stdio bundle/plugin path is unaffected.

## Committed bundle (`build/seq-server.js`)
`build/` is git-ignored **except** `build/seq-server.js`, which is a committed, self-contained
esbuild bundle (all deps incl. `openredaction` inlined; `createRequire` aliased to `__cr` in the
banner to avoid a collision with OpenRedaction's own inlined `createRequire`). The WebMed
`claude-plugins` marketplace runs the `seq-ops` plugin's MCP server straight from this file via
`node ${CLAUDE_PLUGIN_ROOT}/build/seq-server.js` — github-sourced plugins are **not** `npm install`-ed,
so the server must be dependency-free at runtime. **Re-run `npm run build` and re-commit
`build/seq-server.js` after any `src/` change**, or the plugin ships stale server code. CI
(`.github/workflows/ci.yml`) enforces this: it rebuilds and fails if the committed bundle drifts
from `src/`. `esbuild` is pinned to an exact version so the bundle is byte-reproducible.

## Code Style Guidelines
- **Imports**: Use ESM-style imports (`import x from 'y'`) with `.js` extension for local imports
- **Types**: Prefer explicit typing; use TypeScript interfaces for complex objects
- **Error Handling**: Use try/catch with typed errors (`error as Error`)
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/interfaces
- **Structure**: Group related functions together; export only necessary items
- **Environment**: Use environment variables for configuration with defaults
- **Documentation**: Document function parameters and return values with JSDoc

## Project Structure
- `src/` - TypeScript source files (`seq-server.ts` entry point, `redact.ts` PII redaction)
- `src/__tests__/` - Jest unit tests
- `build/` - Compiled JavaScript output
- `prompts/` - MCP prompt templates
- `skills/seq-ops/` - Claude Code skill for Seq log analysis & incident investigation
- `.claude-plugin/marketplace.json` - Claude Code plugin marketplace manifest

## MCP Server Standards
- Use zod for parameter validation
- Handle errors gracefully with meaningful error messages
- Return properly formatted JSON responses

## PII Redaction (GDPR / Personvern)
- All log data returned from Seq passes through `redactDeep` (`src/redact.ts`) before
  leaving the server, masking Norwegian personal data: fødselsnummer (incl. D/H/FH-numbers),
  person names (curated dictionary), phone numbers, and emails.
- **Pseudonymous patient identifiers** (`PatientId`, `PatientGuid`, …) are masked by the
  property **NAME**, never by the value: they are GUIDs, identical in form to the
  correlation/request/signal ids that must stay readable. Three passes, because the name is
  not always next to the value: (A) structural — the object key, a Seq `{Name,Value}` /
  `{PropertyName,FormattedValue}` pair, or a `sql_query` `Columns` header (the name sits in a
  SIBLING array, so `group by PatientId` would otherwise return a list of patient ids);
  (B) name-anchored text (`PatientId = '…'`), which is the only pass reaching a Seq ERROR
  BODY, since that path calls `redactText` alone; (C) the values found by A/B swept out of
  every string in the SAME response, so a rendered message repeating the GUID gets the
  identical placeholder. Pass C is limited to distinctive values (GUID, or ≥12 chars with a
  digit) — blanket-replacing a small integer id would corrupt durations and counts. Pass C uses
  TWO patterns because its case sensitivity must AGREE with `pseudonymKey`: GUIDs match
  case-insensitively, everything else exactly. Do not "simplify" that back to one case-insensitive
  regex over a lower-cased lookup — two distinct opaque ids differing only by case then collapse into
  one placeholder, the false "same patient" the determinism guarantee exists to prevent.
- Pass C enters each collected GUID in the alternation in BOTH the braced and the bare form. Both
  occur in the wild (.NET's `Guid.ToString("B")` writes `{3fa8…}`, the default writes it bare) and the
  sweep is otherwise ASYMMETRIC: a bare value already matches inside braces (a brace passes the
  alphanumeric lookarounds), but a value collected braced never matches a bare occurrence and leaves
  it unmasked. `pseudonymKey` strips braces, so either form resolves to one placeholder.
- Pass C's value count is capped (`MAX_SWEEP_VALUES`, 1 000). `group by PatientId` returns one
  distinct id PER ROW, and the alternation's compilation is SYNCHRONOUS and linear in that count
  (measured: ~4 ms at 1 000, ~550 ms at 100 000, ~2.3 s at 300 000) — an event-loop stall for every
  other user of the hosted server. Matching itself stays cheap, so do not "optimise" the match path
  instead. The cap is safe because the responses that collect thousands of ids are ROWSETS, whose ids
  the STRUCTURAL pass masks cell by cell and which carry no free text to sweep.
- `maskIdentifierValue` serialises a non-scalar value through `identifierObjectText`, which CATCHES
  `JSON.stringify` (it throws on a circular structure or a nested BigInt). Fail-closed: the value is
  still masked, with a fixed marker hashed in place of its text. A throw on the redaction path would
  abort masking for the whole payload — the one failure mode a privacy filter must not have.
- Identifier placeholders are `[PSEUDONYM_<8 hex>]`, a SALTED digest whose salt defaults to a
  RANDOM per-process value. Do not "simplify" that to an unsalted hash: an unsalted digest is
  a stable pseudonym of the identifier, letting anyone with a candidate GUID confirm the
  patient appears in an exported excerpt. `SEQ_PSEUDONYM_SALT` trades that away for stability
  across restarts/replicas and is a SECRET. The `_` before the digest is load-bearing — it
  denies the `\b`-anchored phone/fnr patterns a boundary inside a placeholder we just wrote.
- `SEQ_PSEUDONYM_ID_PROPERTIES` EXTENDS the built-in identifier name list and can never shrink
  it (same rule as the other WebMed connectors' privacy lists). `UserId`/`DoctorId`/
  `PractitionerId` are deliberately absent by default: WebMed staff, not the data subject.
- Enabled by default; set `SEQ_REDACTION_ENABLED=false` to disable (e.g. local debugging
  against an instance with no real personal data).
- Redaction runs entirely in-process — no log content is sent anywhere.
- See `README.md` for covered data types and known limitations.
