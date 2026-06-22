# MCP-SERVER-SEQ DEVELOPMENT GUIDE

## Build & Run Commands
- Build: `npm run build` (tsc emit, then esbuild bundles a self-contained `build/seq-server.js`)
- Bundle only: `npm run bundle` (esbuild → single-file `build/seq-server.js`)
- Start: `npm run start`
- Development: `npm run dev` (watch mode)
- Test script: `npm run test-script`
- Run specific test: `npx jest src/__tests__/your-test-file.test.ts`

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
- `src/` - TypeScript source files
- `build/` - Compiled JavaScript output
- `prompts/` - MCP prompt templates

## MCP Server Standards
- Use zod for parameter validation
- Handle errors gracefully with meaningful error messages
- Return properly formatted JSON responses