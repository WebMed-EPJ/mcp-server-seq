/**
 * Boots the real MCP server over an in-memory transport and reads `tools/list`
 * exactly as a client does. Two things this pins that a unit test on the
 * handlers cannot:
 *
 * 1. Every tool carries `readOnlyHint` — without annotations a connector UI
 *    (claude.ai → Settings → Connectors) has nothing to group by and dumps all
 *    of them into one "Other tools" bucket.
 * 2. `triggered_by_user` is NOT in any tool's `required` list — a hard schema
 *    requirement failed the whole call with an opaque validation error when a
 *    client omitted it. It is enforced in `withAccessLog` instead, and only
 *    for shared service accounts.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { silentLogger } from "../logger.js";
import { createSeqServer } from "../server.js";

const TOOL_NAMES = ["get_signals", "get_events", "get_alert_state", "sql_query"];

async function listTools() {
  const server = createSeqServer(silentLogger);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    return (await client.listTools()).tools;
  } finally {
    await client.close();
    await server.close();
  }
}

describe("tools/list", () => {
  it("registers exactly the four Seq tools", async () => {
    const tools = await listTools();
    expect(tools.map(t => t.name).sort()).toEqual([...TOOL_NAMES].sort());
  });

  it("annotates every tool as read-only, so a connector UI can group them", async () => {
    const tools = await listTools();
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.openWorldHint).toBe(true);
      expect(tool.annotations?.title ?? tool.title).toBeTruthy();
    }
  });

  it("does not require triggered_by_user on any tool", async () => {
    const tools = await listTools();
    for (const tool of tools) {
      const required = (tool.inputSchema as { required?: string[] }).required ?? [];
      expect(required).not.toContain("triggered_by_user");
      expect(Object.keys((tool.inputSchema as { properties?: object }).properties ?? {}))
        .toContain("triggered_by_user");
    }
  });
});
