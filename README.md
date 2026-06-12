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

All log data returned from Seq (events, signals and alert state) is passed
through a redaction step before it leaves the server, so personal data is
masked by default. This matters when logs may contain personal data — e.g. in
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

- **Names are best-effort.** Detection relies on the library's NER and is not
  guaranteed: uncommon names and some hyphenated names may be only partially
  masked. Fødselsnummer (the strongest identifier) is masked reliably; do not
  rely on name masking alone as your only safeguard for free-text fields.
- **Phone over-redaction.** Bare 8-digit numbers starting with 4 or 9 are
  treated as mobile numbers, so an unrelated 8-digit value in a string (e.g.
  an order id) starting with those digits may be masked as a phone number.
  This is a deliberate privacy-first trade-off.

Redaction is built on the [`openredaction`](https://www.npmjs.com/package/openredaction)
library and runs **entirely in-process** — no audit backend, metrics exporter,
webhook or other network feature is enabled, so log content never leaves the
server. Replacements are deterministic placeholders (e.g. `[FNR_1234]`,
`[NAME_5678]`), so the same value maps to the same placeholder within a
response. Non-personal numeric fields such as status codes, durations and
timestamps are preserved to keep logs useful for debugging.

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

The `get-events` tool supports the following time range options:
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
