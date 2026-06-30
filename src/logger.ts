/**
 * Tiny structured logger for the Seq MCP connector.
 *
 * Two hard constraints shape it (ported from the WebMed Lime/m365 connectors):
 *   1. STDERR ONLY. In stdio mode the MCP JSON-RPC protocol owns STDOUT —
 *      writing a log line there would corrupt the stream and break the client.
 *      So the default sink is `process.stderr`. The remote (HTTP) entry point
 *      has no such constraint but uses the same logger for consistency.
 *   2. PRIVACY (GDPR / Personvern). The logger is a dumb transport — it never
 *      inspects or scrubs what it is given. Callers MUST NOT pass the Seq API
 *      key, Seq response bodies, or any personal data into it. Request logging
 *      records only method/path/status/size/duration, and query-string VALUES
 *      are masked by `sanitizeLogPath` before they ever get here.
 *
 * Level is read from `SEQ_LOG_LEVEL` (debug|info|warn|error|silent, default
 * info). `sink`/`now` are injectable so tests can capture lines deterministically.
 */

import type { NextFunction, Request, Response } from "express";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

/** Numeric rank so a line is emitted only when its level >= the threshold. */
const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

/** Structured fields appended to a line as compact JSON. */
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export interface LoggerOptions {
  /** Minimum level to emit. Default "info". */
  level?: LogLevel;
  /** Output sink (one call per line, no trailing newline). Default: stderr. */
  sink?: (line: string) => void;
  /** Prefix tag shown on every line. Default "WebMed Seq connector". */
  name?: string;
  /** Clock for the timestamp. Default: `new Date().toISOString()`. */
  now?: () => string;
}

/**
 * Coerce an env-var string into a LogLevel. Empty/unset → "info". An
 * unrecognised value also falls back to "info" rather than crashing the
 * connector over a logging typo.
 */
export function parseLogLevel(raw: string | undefined): LogLevel {
  const value = (raw ?? "").trim().toLowerCase();
  switch (value) {
    case "debug":
    case "info":
    case "warn":
    case "error":
    case "silent":
      return value;
    default:
      return "info";
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const threshold = LEVEL_RANK[options.level ?? "info"];
  const sink = options.sink ?? ((line: string) => process.stderr.write(line + "\n"));
  const name = options.name ?? "WebMed Seq connector";
  const now = options.now ?? (() => new Date().toISOString());

  const emit = (level: LogLevel, message: string, fields?: LogFields): void => {
    if (LEVEL_RANK[level] < threshold) {
      return;
    }
    let line = `${now()} [${name}] ${level.toUpperCase().padEnd(5)} ${message}`;
    if (fields && Object.keys(fields).length > 0) {
      // JSON keeps the fields machine-parseable and unambiguous even when a
      // value contains spaces. Never pass secrets/PII as a field value.
      line += " " + JSON.stringify(fields);
    }
    sink(line);
  };

  return {
    debug: (message, fields) => emit("debug", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
    error: (message, fields) => emit("error", message, fields),
  };
}

/** A logger that drops everything. */
export const silentLogger: Logger = createLogger({ level: "silent" });

/** Build the connector's logger from `SEQ_LOG_LEVEL`. */
export function loggerFromEnv(): Logger {
  return createLogger({ level: parseLogLevel(process.env.SEQ_LOG_LEVEL) });
}

/**
 * Normalise an unknown thrown value into log fields: its name, a SAFE summary,
 * and (when present) an HTTP status. Never includes the stack. A Seq upstream
 * error's `.message` can embed the raw Seq response body (which may carry PII),
 * so when an HTTP `status` is present we log only `errorName` + `status` + a
 * fixed summary, never the message body (GDPR). Errors without a status (config
 * errors, bind errors) carry no PII, so their message is safe to log.
 */
export function errorFields(err: unknown): LogFields {
  if (err instanceof Error) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") {
      return { errorName: err.name, status, error: `request failed (HTTP ${status})` };
    }
    return { error: err.message, errorName: err.name };
  }
  return { error: String(err) };
}

/**
 * Mask query-string VALUES in a request path before it is logged. The base path
 * and the parameter KEYS are safe and useful for debugging, but on the remote
 * server the OAuth `/callback?code=…&state=…` query carries the auth code, so
 * every value is replaced with `<redacted>`. Keys survive so a log reader can
 * still see WHICH params ran. (Exported for tests.)
 */
export function sanitizeLogPath(path: string): string {
  const q = path.indexOf("?");
  if (q === -1) {
    return path;
  }
  const base = path.slice(0, q);
  const masked = path
    .slice(q + 1)
    .split("&")
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const eq = pair.indexOf("=");
      return eq === -1 ? pair : `${pair.slice(0, eq)}=<redacted>`;
    })
    .join("&");
  return masked ? `${base}?${masked}` : base;
}

/**
 * Express middleware that access-logs every incoming HTTP request once it
 * completes: method, path (query VALUES masked), status and response size
 * (bytes, from Content-Length when present) and duration. `/healthz` is skipped
 * so load-balancer probes don't flood the log. 5xx logs at error, 4xx at warn,
 * else info. Downstream handlers log their own errors; this is the access log.
 */
export function accessLogMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip the unauthenticated probes — they fire frequently and would
    // otherwise flood the access log.
    if (req.path === "/healthz") {
      next();
      return;
    }
    const startedAt = Date.now();
    res.on("finish", () => {
      // res.getHeader can return number | string | string[] | undefined.
      // Number() handles a number or numeric string and yields NaN for the rest
      // (undefined / multi-value), which Number.isFinite then maps to null.
      const lengthNum = Number(res.getHeader("content-length"));
      const fields = {
        method: req.method,
        path: sanitizeLogPath(req.originalUrl),
        status: res.statusCode,
        bytes: Number.isFinite(lengthNum) ? lengthNum : null,
        ms: Date.now() - startedAt,
      };
      if (res.statusCode >= 500) {
        logger.error("http request", fields);
      } else if (res.statusCode >= 400) {
        logger.warn("http request", fields);
      } else {
        logger.info("http request", fields);
      }
    });
    next();
  };
}
