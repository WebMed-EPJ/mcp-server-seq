#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import 'dotenv/config';
import { loggerFromEnv } from "./logger.js";
import { createSeqServer, SEQ_API_KEY } from "./server.js";

// The stdio entry point. This is the file the WebMed `seq-ops` marketplace
// plugin runs (bundled, dependency-free, into build/seq-server.js). The HTTP
// transport lives in a separate entry point (remote.ts) so the stdio bundle
// stays free of express/OAuth dependencies.

if (!SEQ_API_KEY) {
  console.error('Warning: SEQ_API_KEY is not set. Some Seq instances require authentication.');
}

// Stdio has no per-request auth — a single local operator behind SEQ_API_KEY
// — so every tool-call access-log line is attributed to the fixed caller
// "stdio" (see access-log.ts) rather than an individual identity.
const logger = loggerFromEnv();
const server = createSeqServer(logger);

// Start the server with stdio transport
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

process.stdin.on("close", () => {
  console.error("Seq MCP Server closed");
  server.close();
});

export default server;
