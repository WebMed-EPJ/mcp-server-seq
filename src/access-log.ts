/**
 * MCP tool-call access logging: WHO called WHAT, and whether it succeeded —
 * the same question an HTTP access log answers (see `accessLogMiddleware` in
 * logger.ts), but one layer up, at the MCP tool-call boundary rather than the
 * raw HTTP request. This is what lets an operator answer "who ran this Seq
 * query" without inspecting the query itself.
 *
 * Deliberately logs ONLY this metadata: the caller identity, the tool name,
 * success/failure, and duration (the logger stamps the timestamp). It never
 * logs tool arguments (Seq query text, filters, signal IDs) or any part of a
 * tool's result — those can carry personal data pulled from Seq log content,
 * and this connector's whole purpose is to keep that data from leaving the
 * process unredacted (see redact.ts). Keep that same discipline here: this is
 * an access log, not a debug trace. On a thrown exception only the error's
 * NAME is logged (e.g. "TypeError") — never `.message`, since a handler can
 * throw with the Seq query or response embedded in it.
 *
 * Known limitation: this only wraps each tool/resource's own callback. The
 * MCP SDK validates a call's arguments against its zod schema BEFORE invoking
 * that callback, so a malformed call that fails schema validation never
 * reaches `withAccessLog` and is not recorded here (it is visible only in the
 * SDK/transport's own error handling).
 *
 * Caller identity: an interactive user is identified by their Entra
 * `homeAccountId` — a stable, per-user pseudonymous identifier the remote
 * connector already keeps for audit (see remote/provider.ts) — never their
 * email/UPN or the Entra token itself. A machine (service) caller already
 * carries a `service:<clientId>` marker (see remote/service-auth.ts) and is
 * logged as-is. The stdio entry point has no per-request auth at all — a
 * single local operator sits behind the shared SEQ_API_KEY — so it is
 * reported as the fixed caller "stdio" rather than left blank.
 *
 * `triggeredByUser` is a caller-supplied identity for shared service-account
 * clients (for example Claude Tag). It is logged separately from the
 * authenticated `caller`, as a short deterministic hash, and must not be
 * treated as proof of identity.
 */
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createHash } from "node:crypto";
import type { Logger } from "./logger.js";

/** Resolve a PII-safe caller identity from a tool call's AuthInfo (if any). */
export function callerId(authInfo: AuthInfo | undefined): string {
  const extra = authInfo?.extra;
  const homeAccountId =
    extra && typeof extra === "object" ? (extra as Record<string, unknown>).homeAccountId : undefined;
  if (typeof homeAccountId === "string" && homeAccountId) {
    return homeAccountId;
  }
  return authInfo ? "unknown" : "stdio";
}

// `any` is required here to accept every tool/resource callback shape.
type AnyHandler = (...args: any[]) => any;

function triggeredByUser(args: unknown): string | undefined {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return undefined;
  }
  const value = (args as Record<string, unknown>).triggered_by_user;
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  return createHash("sha256").update(value.trim()).digest("hex").slice(0, 16);
}

/**
 * Wrap an MCP tool/resource handler so every call is access-logged. `extra`
 * (carrying `authInfo`) is always the LAST argument passed to an MCP handler,
 * regardless of how many typed arguments precede it (tool args, resource
 * uri/variables, ...), so this wraps `server.tool()` and `server.resource()`
 * callbacks uniformly without depending on their exact arity.
 */
export function withAccessLog<T extends AnyHandler>(logger: Logger, name: string, handler: T): T {
  const wrapped = async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const extra = args[args.length - 1] as { authInfo?: AuthInfo } | undefined;
    const caller = callerId(extra?.authInfo);
    const humanCaller = triggeredByUser(args[0]);
    const startedAt = Date.now();
    try {
      const result = await handler(...args);
      const isError = Boolean(result && typeof result === "object" && (result as { isError?: unknown }).isError);
      const fields = {
        tool: name,
        caller,
        ...(humanCaller ? { triggeredByUser: humanCaller } : {}),
        status: isError ? "error" : "ok",
        ms: Date.now() - startedAt,
      };
      // A handler-reported failure (isError) is logged at the same level as a
      // thrown one, so `SEQ_LOG_LEVEL=warn`/`error` doesn't silently drop it.
      if (isError) {
        logger.error("tool call", fields);
      } else {
        logger.info("tool call", fields);
      }
      return result;
    } catch (err) {
      // Deliberately does NOT reuse logger.ts's `errorFields(err)` here: that
      // helper includes `err.message` for non-HTTP errors, and a handler can
      // throw with the Seq query/response embedded in its message — exactly
      // the content this access log must never carry. Only the error's NAME
      // (a fixed, safe type tag like "TypeError") is logged; `status: "error"`
      // is set last so it can never be shadowed by another field.
      const errorName = err instanceof Error ? err.name : "UnknownError";
      logger.error("tool call", {
        tool: name,
        caller,
        ...(humanCaller ? { triggeredByUser: humanCaller } : {}),
        ms: Date.now() - startedAt,
        errorName,
        status: "error",
      });
      throw err;
    }
  };
  return wrapped as T;
}
