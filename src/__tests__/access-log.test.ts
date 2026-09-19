import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createHash } from "node:crypto";
import { MISSING_AUDIT_LABEL_MESSAGE, callerId, withAccessLog } from "../access-log.js";
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

  it("logs a caller-supplied human identity separately from the authenticated caller", async () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), now: () => "T" });
    const handler = async (_args: { triggered_by_user: string }, _extra: { authInfo?: AuthInfo }) => ({
      content: [],
    });

    const wrapped = withAccessLog(logger, "get_signals", handler);
    await wrapped(
      { triggered_by_user: "  jane.doe  " },
      { authInfo: authInfo({ homeAccountId: "service:claude-tag" }) },
    );

    expect(lines[0]).toContain('"caller":"service:claude-tag"');
    const expectedId = createHash("sha256").update("jane.doe").digest("hex").slice(0, 16);
    expect(lines[0]).toContain(`"triggeredByUser":"${expectedId}"`);
    expect(lines[0]).not.toContain("jane.doe");
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
    // A handler-reported failure must be logged at ERROR level, not INFO,
    // so `SEQ_LOG_LEVEL=warn`/`error` doesn't silently drop it.
    expect(lines[0]).toContain("ERROR");
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
    // The thrown error's message must never be logged — it can carry the Seq
    // query or response content (see the errorName-only doc comment).
    expect(lines[0]).not.toContain("unexpected failure");
    expect(lines[0]).toContain('"errorName":"Error"');
  });

  it("logs a fixed 'error' status even when the thrown error carries an HTTP status code", async () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), now: () => "T" });
    const handler = async (_extra: { authInfo?: AuthInfo }) => {
      const err = new Error("upstream said no") as Error & { status: number };
      err.status = 502;
      throw err;
    };

    const wrapped = withAccessLog(logger, "sql_query", handler);

    await expect(wrapped({ authInfo: authInfo({ homeAccountId: "user-4" }) })).rejects.toThrow();
    // Regression test: a naive `...errorFields(err)` spread after `status:
    // "error"` would let the HTTP status (a number) silently overwrite the
    // access-log's own "ok"/"error" status field.
    expect(lines[0]).toContain('"status":"error"');
    expect(lines[0]).not.toContain('"status":502');
    expect(lines[0]).not.toContain("upstream said no");
  });

  it("retains the hashed human caller label when the handler throws", async () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), now: () => "T" });
    const handler = async (_args: { triggered_by_user: string }, _extra: { authInfo?: AuthInfo }) => {
      throw new Error("failed");
    };

    const wrapped = withAccessLog(logger, "sql_query", handler);
    await expect(
      wrapped(
        { triggered_by_user: "jane.doe" },
        { authInfo: authInfo({ homeAccountId: "service:claude-tag" }) },
      ),
    ).rejects.toThrow("failed");

    const expectedId = createHash("sha256").update("jane.doe").digest("hex").slice(0, 16);
    expect(lines[0]).toContain('"caller":"service:claude-tag"');
    expect(lines[0]).toContain(`"triggeredByUser":"${expectedId}"`);
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

describe("requireAuditLabel", () => {
  /** A stand-in handler that records whether it ran (no `jest` global under ESM). */
  function countingHandler() {
    const state = { calls: 0 };
    const handler = async (..._args: unknown[]) => {
      state.calls += 1;
      return { content: [{ type: "text" as const, text: "ran" }] };
    };
    return { state, handler };
  }

  it("refuses a shared service account that supplies no audit label", async () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), now: () => "T" });
    const { state, handler } = countingHandler();

    const wrapped = withAccessLog(logger, "sql_query", handler, { requireAuditLabel: true });
    const result = await wrapped({}, { authInfo: authInfo({ homeAccountId: "service:claude-tag" }) });

    expect(state.calls).toBe(0);
    expect(result).toEqual({
      content: [{ type: "text", text: MISSING_AUDIT_LABEL_MESSAGE }],
      isError: true,
    });
    expect(lines[0]).toContain('"errorName":"MissingAuditLabel"');
    expect(lines[0]).toContain('"caller":"service:claude-tag"');
  });

  it("lets an interactive user through without a label — Entra already identifies them", async () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), now: () => "T" });
    const { state, handler } = countingHandler();

    const wrapped = withAccessLog(logger, "get_events", handler, { requireAuditLabel: true });
    await wrapped({ filter: "@Level = 'Error'" }, { authInfo: authInfo({ homeAccountId: "abc.def" }) });

    expect(state.calls).toBe(1);
    expect(lines[0]).toContain('"status":"ok"');
    expect(lines[0]).not.toContain("triggeredByUser");
  });

  it("lets the stdio entry point through without a label", async () => {
    const logger = createLogger({ sink: () => {}, now: () => "T" });
    const { state, handler } = countingHandler();

    const wrapped = withAccessLog(logger, "get_signals", handler, { requireAuditLabel: true });
    await wrapped({});

    expect(state.calls).toBe(1);
  });

  it("runs a service call that DOES carry a label", async () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), now: () => "T" });
    const { state, handler } = countingHandler();

    const wrapped = withAccessLog(logger, "sql_query", handler, { requireAuditLabel: true });
    await wrapped(
      { triggered_by_user: "jane.doe" },
      { authInfo: authInfo({ homeAccountId: "service:claude-tag" }) },
    );

    expect(state.calls).toBe(1);
    expect(lines[0]).toContain('"status":"ok"');
  });
});
