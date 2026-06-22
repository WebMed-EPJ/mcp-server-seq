# MCP-SERVER-SEQ DEVELOPMENT GUIDE

## Build & Run Commands
- Build: `npm run build`
- Start: `npm run start`
- Development: `npm run dev` (watch mode)
- Test (all unit tests): `npm test` (Jest)
- Run specific test: `npx jest src/__tests__/your-test-file.test.ts`
- Manual smoke test against a live Seq instance: `npm run test-script`

Requires Node.js >= 20 (see `engines` in package.json).

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
