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

The server reads the following environment variables:

- `SEQ_BASE_URL` (optional): Your Seq server URL (defaults to 'http://localhost:8080')
- `SEQ_API_KEY` (see note\*): Your Seq API key
- `SEQ_API_KEY_CMD` (see note\*): A command, run once at startup, whose stdout is used
  as the API key. Use this *instead of* `SEQ_API_KEY` to keep the key out of config
  files (see [Authentication](#authentication) below). `SEQ_API_KEY` takes precedence
  if both are set.
- `SEQ_API_KEY_CMD_TIMEOUT_MS` (optional): Timeout for `SEQ_API_KEY_CMD`, in
  milliseconds (default `30000`). Bounds startup so a hanging command (e.g. an
  unanswered biometric/SSO prompt) can't block the server indefinitely.
- `SEQ_REDACTION_ENABLED` (optional): Set to `false` to disable PII redaction (defaults to enabled)

\* Provide the API key via either `SEQ_API_KEY` or `SEQ_API_KEY_CMD`. A key is
required for Seq instances that enforce authentication; if neither is set the server
logs a warning and starts anyway (so it still works against an unauthenticated Seq).

## Authentication

Seq's HTTP API authenticates with an **API key** (`X-Seq-ApiKey`). It does **not**
accept OAuth2 / OpenID Connect bearer tokens for programmatic access — Seq's OIDC
support is for interactive web-UI login only — so this server uses an API key. To
avoid storing that key in plaintext inside `.mcp.json` / `claude_desktop_config.json`,
set `SEQ_API_KEY_CMD` to a command that fetches it at startup from a secrets manager
or OS keychain. The key is fetched once when the server starts and never written to disk.

### 1Password

With the [1Password CLI](https://developer.1password.com/docs/cli/) (`op`) and the
desktop app's CLI integration enabled, the key is unlocked locally (e.g. via Touch ID)
and never lives in a file. Store the key in a 1Password item, then reference it:

```bash
claude mcp add --transport stdio \
  --env SEQ_BASE_URL=http://localhost:5341 \
  --env SEQ_API_KEY_CMD="op read op://Employee/Seq/password" \
  seq -- npx -y mcp-seq
```

(`op://Employee/Seq/password` = `op://<vault>/<item>/<field>` — adjust to your vault.)

### Other secrets sources

`SEQ_API_KEY_CMD` is just a shell command, so any tool that prints the secret to
stdout works:

```bash
# macOS Keychain
SEQ_API_KEY_CMD="security find-generic-password -s seq-api-key -w"
# libsecret / GNOME Keyring
SEQ_API_KEY_CMD="secret-tool lookup service seq-api-key"
# AWS Secrets Manager
SEQ_API_KEY_CMD="aws secretsmanager get-secret-value --secret-id seq --query SecretString --output text"
```

If the command fails, times out, or prints nothing, the server logs a clear error
and exits. The error reports only a safe reason (exit code, signal, or timeout) —
never the command's output or stderr — to avoid leaking secrets into logs; run the
command yourself to debug. Tune the timeout with `SEQ_API_KEY_CMD_TIMEOUT_MS`.

> **Why not OAuth?** OAuth would require Seq to accept externally-issued tokens on
> its API, which it does not. Per-user API keys with least-privilege permissions
> (created and rotated in Seq) combined with `SEQ_API_KEY_CMD` give you
> traceability and easy revocation — important under GDPR / Personvern — without a
> shared static secret in config files.

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
