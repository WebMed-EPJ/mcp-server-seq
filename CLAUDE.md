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
- **`src/truncate.ts`** — pure response-trimming + query-cost helpers (`truncateEventList`,
  `truncateQueryResult`, `budgetWarning`, `CHARACTER_LIMIT`), imported by `server.ts` and unit-tested
  without booting a transport. Two non-obvious things live here. (1) A `group by time(...)` query
  answers with **`Slices`** and NO top-level `Rows`, so trimming that only looked at `Rows` let a
  time series bypass the 25 000-character cap entirely — `group by time(5s)` over 1h measured 83 000
  characters on prod. Keep both shapes handled. `Rows` are trimmed from the END (the query's
  `order by` puts the significant ones first) while `Slices` are trimmed from the START (they arrive
  oldest-first, and an incident is about the recent end); the message names a coarser `time()` bucket
  as the remedy, because that returns the WHOLE window rather than a truncated one. (2) `budgetWarning`
  flags a call that SUCCEEDED but spent ≥60% of `SEQ_REQUEST_TIMEOUT_MS`, returned as a separate
  content block ahead of the payload — the same aggregate over the same 24h window measured 11.5s warm
  and over 30s (timeout) cold, so "it worked" is not evidence the next widening will.
- **Query cost is the timeout story.** `SEQ_REQUEST_TIMEOUT_MS` (default 30 000) bounds every Seq
  call. Cost tracks events scanned = window × ingest rate, and prod ingests ~1M events/hour, so
  `sql_query`'s 1d default window is itself at the ceiling. Do NOT "fix" timeouts by raising the
  value: the MCP client and the ingress in front of `/mcp` have their own budgets, and once one of
  those fires first the caller gets an opaque transport failure (`MCP server connection lost`)
  instead of the timeout message, which is written FOR THE MODEL and names the query-shape ladder
  (narrow the window → add a selective predicate → coarsen the rollup → switch tool). The measured
  cost table lives in `README.md` and in the skill.
- **Seq SQL rejects three things the tool descriptions used to demonstrate**, each with a `400`:
  `order by count(*)` (label it — `count(*) as n … order by n`), selecting the grouping column
  (`group by Environment` already emits it; selecting it returns it twice) and `count(distinct X)`
  (needs `count(distinct(X))`). Verified against prod Seq. The `sql_query` description and the
  `seq-ops` skill are what the model copies from, so an invalid example there costs a round trip on
  every investigation — keep both correct.
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
- Enabled by default; set `SEQ_REDACTION_ENABLED=false` to disable (e.g. local debugging
  against an instance with no real personal data).
- Redaction runs entirely in-process — no log content is sent anywhere.
- See `README.md` for covered data types and known limitations.
