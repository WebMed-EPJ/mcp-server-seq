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
- **`src/seq-server.ts`** — the **stdio** entry point. Thin: reads env, calls `createSeqServer(logger)`,
  connects a `StdioServerTransport`. This is what gets esbuild-bundled into `build/seq-server.js`
  and run by the `claude-plugins` `seq-ops` plugin. Stays **dependency-free** (no express/msal).
- **`src/server.ts`** — `createSeqServer(logger)`, the shared server factory: registers all tools/resources
  (`get_signals`, `get_events`, `get_alert_state`, `sql_query`, `signals` resource) and reads the
  `SEQ_BASE_URL`/`SEQ_API_KEY` upstream config. Both entry points use it, so they expose an identical
  tool surface and the same `redactDeep` PII guarantee. `logger` defaults to `loggerFromEnv()` if
  omitted; both entry points pass their own instance explicitly so the tool-call access log (below)
  shares the same logger/level as each entry point's other logging.
- **`src/access-log.ts`** — `withAccessLog(logger, name, handler)` wraps every tool/resource callback
  registered in `server.ts` to emit a structured access-log line per call: `tool`, `caller`,
  `status` (`ok`/`error`, from either a thrown error or an `isError: true` result), and `ms`
  (duration) — timestamp comes from the logger itself. Deliberately **never** logs the call's
  arguments (Seq query text, filters) or its result (log content) — same discipline as `redact.ts`.
  `callerId(authInfo)` derives `caller` from `AuthInfo.extra.homeAccountId` (interactive users) or
  the existing `service:<clientId>` marker (M2M callers, see `service-auth.ts`); with no `AuthInfo`
  at all (the stdio entry point, which has no per-request auth) it reports the fixed caller `"stdio"`.
  `AuthInfo`/`extra` is always the LAST positional argument to any MCP tool/resource callback
  regardless of its declared arity, which is what makes one generic wrapper work for all of them.
  The caller-supplied `triggered_by_user` audit label is **optional in the zod schema and enforced
  here** (`AccessLogOptions.requireAuditLabel`, set for the four TOOLS, not for the argument-less
  `signals` resource), and only when the caller is a SHARED service account (`service:<clientId>`):
  that is the only case where the label carries information, since an interactive user is already
  identified by their own Entra `homeAccountId`. As a required schema field it bought no audit value
  from interactive callers and cost them the whole call — a client that omitted it got
  `MCP error -32602: Invalid arguments … triggered_by_user Required`, thrown by the SDK before any
  handler ran. A service call without it is refused as a tool RESULT (`isError: true`,
  `MISSING_AUDIT_LABEL_MESSAGE`) so the model reads it and retries with the field, rather than the
  client reporting a connector malfunction.
- **Tool annotations** — all four tools are registered with `server.registerTool(...)` carrying
  `READ_ONLY_TOOL` (`readOnlyHint`/`openWorldHint`, both true — every tool here reads) plus a
  human `title`. Same convention as the m365/lime connectors, and the reason is the same: a
  connector UI (claude.ai → Settings → Connectors) groups and gates tools by `readOnlyHint`, and
  with no annotations at all every tool lands in one "Other tools" bucket. Annotations are hints
  (the spec says clients must treat them as untrusted) — the redaction and access log remain the
  enforcement. `src/__tests__/server.test.ts` drives a real MCP client over an in-memory transport
  and reads `tools/list`, so the annotations and the optional `triggered_by_user` cannot regress
  silently. A client must re-read `tools/list` (reconnect the connector) after a redeploy before
  the grouping shows up.
- **`src/remote.ts`** — the **remote HTTP** entry point (Docker). Serves the same tools over an
  OAuth-protected **Streamable HTTP** `/mcp` endpoint (Express). Authorization is a full OAuth 2.1
  flow (DCR + PKCE) federated to **Microsoft Entra** — the same model as the WebMed Lime/m365
  connectors. Sign-in only AUTHENTICATES the caller; `SEQ_API_KEY` stays global + server-side. Ports
  the OAuth machinery verbatim: `src/remote/provider.ts` (`EntraOAuthProvider`), `src/remote/stores.ts`
  (in-memory token store; single-instance only), `src/remote-config.ts` (`loadRemoteConfig`), and a
  stderr-only `src/logger.ts`. Fails closed without `REMOTE_PUBLIC_URL`/`TENANT_ID`/`CLIENT_ID`/
  `CLIENT_SECRET`/`SEQ_API_KEY`. Endpoints: `/healthz` (unauth), OAuth metadata/`/authorize`/`/token`/
  `/revoke`/`/register`, `/callback`, `/mcp` (bearer; POST only, GET/DELETE → 405).
  The `/mcp` bearer check is **dual-issuer**: `verifyAccessToken` routes each token by `iss` —
  besides interactive Entra users it accepts two opt-in machine paths, each a `(token) => AuthInfo|null`
  verifier tried before the user store. `src/remote/service-auth.ts` validates **Entra app-only**
  (client-credentials) tokens (opt-in via `ENTRA_ALLOWED_CLIENT_IDS`); `src/remote/github-oidc.ts`
  validates **GitHub Actions OIDC** tokens for keyless gh-aw automation (opt-in via `GITHUB_OIDC_ENABLED`
  + `GITHUB_OIDC_AUDIENCE` + a `GITHUB_OIDC_ALLOWED_REPOSITORIES`/`_OWNERS`/`_SUBJECTS` allow-list;
  signature via GitHub JWKS with `jose`, strict `aud`, default-deny). Both self-gate on their issuer
  so a token for one path never disturbs the others. Deploy note: `docs/github-oidc-deployment.md`.
- **Dependency split:** `express` + `@azure/msal-node` are runtime deps used **only** by `remote.ts`.
  Because `seq-server.ts` → `server.ts` never imports them, the esbuild stdio bundle stays free of
  them. The Docker image compiles `src/` with `tsc` (`build:server`) and ships prod `node_modules`
  (`npm ci --omit=dev`) — it is NOT esbuild-bundled.
- **`src/mandatory-signal.ts`** — the **always-on signal scope**. Against production Seq
  (`seq.intern.webmed.no`) every `get_events`/`sql_query` call is scoped to the **"No Debug"**
  signal (`signal-6612`); `applyMandatorySignal` merges it with whatever `signal` the caller
  passed, and Seq **intersects** comma-separated signal ids (verified on prod: a tenant signal
  plus `signal-6612` returned that tenant's non-Debug events, not the union), so tenant scoping
  still works and nothing can widen past the forced signal. Two properties are the point and must
  not be "configured": there is **no env override** — no disable flag, no id override, only this
  table — for the same reason `PRODUCTION_SEQ_HOSTS` is hard-coded (an env var is what gets copied
  from one overlay into another); and it is keyed by **HOST, not by an "is production" boolean**,
  because a signal id is a row in ONE instance's database — forcing prod's id onto the test
  instance would make Seq reject every call rather than narrow it, so an unknown/unparseable
  `SEQ_BASE_URL` gets NO forced signal (the opposite direction from the redaction fence, which
  reads an unknown host as production; there the wrong guess leaks data, here it would only break
  every query against an instance the id does not belong to). `server.ts` resolves it from the
  module-level `SEQ_BASE_URL` — the same value the requests go to, never a second env read — and
  appends `mandatorySignalNotice` to both tool descriptions, without which a model reads the
  missing Debug events as a failed query and keeps widening the window.
- **`src/seq-host.ts`** — `PRODUCTION_SEQ_HOSTS`, `canonicalHostname`, `hostFromUrl`, `seqHost`:
  one answer to "which Seq instance is this", shared by the redaction fence (`redact.ts`) and the
  mandatory signal. The two normalisations (port dropped, one trailing dot stripped) are
  load-bearing and documented there.
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
- **GUIDs are masked too** (`src/guids.ts`, byte-identical to the copy in
  `WebMed-EPJ/claude-plugins` — keep them diffable): a WebMed patient is identified by a GUID and
  the logs carry them, in a `PatientId` property and inside rendered messages. Pure, unfailable
  string pass, applied before the detector. Markers are `[GUID_n]`, numbered **per RESPONSE**: the
  top-level `redactDeep` call allocates ONE alias map and threads it through every event, property
  and `sql_query` row below it. That is the OPPOSITE scope from the m365 connector's per-item rule,
  and deliberately so — a log is read to follow one request, so the same identifier must carry the
  same marker across the whole answer or the session's lines read as unrelated; m365 returns
  unrelated mail and documents in one page, where a shared marker would assert a link nobody asked
  for. What is not given up: the map is per CALL, in encounter order, never stored, so markers from
  two answers cannot be compared and are not a pseudonym. (An earlier revision scoped this per event
  with a `ROWSET_KEYS` carve-out for `Rows`/`Slices`; both are gone — do not reintroduce them
  without the product decision behind them changing.)
- `GUID_EXEMPT_KEYS` (`TraceId`, `SpanId`, `ParentId`, `ParentSpanId`, `Id`, `Links`) keep their
  values: a W3C trace id and Seq's own `event-<32 hex>` id are bare 32-hex runs no pattern can tell
  from an identifier, and masking them costs request correlation and the paging cursor while
  protecting nobody. The exemption is inherited by the subtree (so `Links.Self` is covered) and
  understands Seq's `{ Name, Value }` property shape, where the key that decides is the sibling
  `Name`. Exempt fields still get the ordinary PII pass — only the GUID step is skipped. Keep the
  list short: each entry is a field where a GUID survives.
- Enabled by default; `SEQ_REDACTION_ENABLED=false` disables the whole step (GUID pass included) but
  is honoured **only** against a Seq instance known to hold no personal data. `redactionOptOutAllowed`
  is an ALLOW-list of hosts (test, localhost, plus `SEQ_NON_PRODUCTION_HOSTS`, which is additive and
  can never unlock the hard-coded `seq.intern.webmed.no`); an unknown host, an unparseable URL or an
  unset `SEQ_BASE_URL` all read as production. Comparison goes through `canonicalHostname`, and both
  normalisations are load-bearing: the PORT is dropped (`URL.host` keeps it, so the documented
  `http://localhost:5341` was refused on the very instance the opt-out is for) and ONE trailing dot
  is stripped (`seq.intern.webmed.no.` is the same host to DNS but not to a string compare, so
  otherwise it both missed the production list and could be added to the extension list to unlock
  it). Two halves on purpose: `assertRedactionConfig()` runs
  in BOTH entry points and refuses to start (a dead pod is visible to whoever deployed it; a silent
  override is not), and `isRedactionEnabled()` fails closed anyway, so a path that forgets the check
  still redacts.
- Redaction runs entirely in-process — no log content is sent anywhere.
- See `README.md` for covered data types and known limitations.
