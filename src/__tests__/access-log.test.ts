import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { callerId, withAccessLog } from "../access-log.js";
import { createLogger } from "../logger.js";

function authInfo(extra: Record<string, unknown> | undefined): AuthInfo {
  return {
    token: "irrelevant",
    clientId: "irrelevant",
    scopes: [],
    extra,
  } as unknown as AuthInfo;
}

describe("callerId", () => {
  it("uses the interactive user's homeAccountId when present", () => {
    expect(callerId(authInfo({ homeAccountId: "abc123.def456" }))).toBe("abc123.def456");
  });

  it("passes through a service caller's homeAccountId marker as-is", () => {
    expect(callerId(authInfo({ homeAccountId: "service:my-client-id", service: true }))).toBe(
      "service:my-client-id",
    );
  });

  it('reports "unknown" when authenticated but no homeAccountId is present', () => {
    expect(callerId(authInfo({}))).toBe("unknown");
    expect(callerId(authInfo(undefined))).toBe("unknown");
  });

  it('reports "stdio" when there is no AuthInfo at all', () => {
    expect(callerId(undefined)).toBe("stdio");
  });
});

describe("withAccessLog", () => {
  it("logs the tool name, caller, ok status and duration on success — never the args or result", () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), now: () => "T" });
    let callCount = 0;
    const handler = async (_args: { query: string }, _extra: { authInfo?: AuthInfo }) => {
      callCount++;
      return { content: [{ type: "text" as const, text: "01017012345 secret result" }] };
    };

    const wrapped = withAccessLog(logger, "sql_query", handler);

    return wrapped({ query: "select 01017012345 from stream" }, { authInfo: authInfo({ homeAccountId: "user-1" }) }).then(
      (result) => {
        expect(callCount).toBe(1);
        expect(result.content[0].text).toContain("01017012345 secret result");
        expect(lines).toHaveLength(1);
        expect(lines[0]).toContain("INFO");
        expect(lines[0]).toContain('"tool":"sql_query"');
        expect(lines[0]).toContain('"caller":"user-1"');
        expect(lines[0]).toContain('"status":"ok"');
        expect(lines[0]).toMatch(/"ms":\d+/);
        // The access log must never leak the query text or the result content.
        expect(lines[0]).not.toContain("01017012345");
        expect(lines[0]).not.toContain("select");
        expect(lines[0]).not.toContain("secret result");
      },
    );
  });

  it("logs status ok/error based on the tool's own isError result (no throw)", async () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), now: () => "T" });
    const handler = async (_extra: { authInfo?: AuthInfo }) => ({
      content: [{ type: "text" as const, text: "boom" }],
      isError: true,
    });

    const wrapped = withAccessLog(logger, "get_events", handler);
    await wrapped({ authInfo: authInfo({ homeAccountId: "user-2" }) });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('"tool":"get_events"');
    expect(lines[0]).toContain('"caller":"user-2"');
    expect(lines[0]).toContain('"status":"error"');
  });

  it("logs an error line and rethrows when the handler itself throws", async () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), now: () => "T" });
    const handler = async (_extra: { authInfo?: AuthInfo }) => {
      throw new Error("unexpected failure");
    };

    const wrapped = withAccessLog(logger, "get_signals", handler);

    await expect(wrapped({ authInfo: authInfo({ homeAccountId: "user-3" }) })).rejects.toThrow(
      "unexpected failure",
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("ERROR");
    expect(lines[0]).toContain('"tool":"get_signals"');
    expect(lines[0]).toContain('"caller":"user-3"');
    expect(lines[0]).toContain('"status":"error"');
  });

  it('reports the caller as "stdio" when the handler is invoked with no authInfo (stdio entry point)', async () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), now: () => "T" });
    const handler = async (_extra: { authInfo?: AuthInfo }) => ({ content: [] });

    const wrapped = withAccessLog(logger, "get_alert_state", handler);
    await wrapped({});

    expect(lines[0]).toContain('"caller":"stdio"');
  });
});
