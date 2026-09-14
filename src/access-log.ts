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
 * an access log, not a debug trace.
 *
 * Caller identity: an interactive user is identified by their Entra
 * `homeAccountId` — a stable, per-user pseudonymous identifier the remote
 * connector already keeps for audit (see remote/provider.ts) — never their
 * email/UPN or the Entra token itself. A machine (service) caller already
 * carries a `service:<clientId>` marker (see remote/service-auth.ts) and is
 * logged as-is. The stdio entry point has no per-request auth at all — a
 * single local operator sits behind the shared SEQ_API_KEY — so it is
 * reported as the fixed caller "stdio" rather than left blank.
 */
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { errorFields, type Logger } from "./logger.js";

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
    const startedAt = Date.now();
    try {
      const result = await handler(...args);
      const isError = Boolean(result && typeof result === "object" && (result as { isError?: unknown }).isError);
      logger.info("tool call", { tool: name, caller, status: isError ? "error" : "ok", ms: Date.now() - startedAt });
      return result;
    } catch (err) {
      logger.error("tool call", { tool: name, caller, status: "error", ms: Date.now() - startedAt, ...errorFields(err) });
      throw err;
    }
  };
  return wrapped as T;
}
