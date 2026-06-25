/**
 * Seq API-key resolution.
 *
 * Kept in a side-effect-free module (no server bootstrap, no command run on
 * import) so the resolution logic can be unit-tested without importing
 * `seq-server.ts`, which starts the stdio transport on import.
 *
 * Seq's HTTP API authenticates with an API key (it does not accept OAuth2/OIDC
 * bearer tokens for programmatic access), so a key is unavoidable. What we *can*
 * avoid is keeping that key in plaintext inside MCP config files: instead of
 * setting `SEQ_API_KEY` directly, an operator can set `SEQ_API_KEY_CMD` to a
 * command that fetches the key at startup from a secrets manager or OS keychain.
 *
 * 1Password example (uses the local desktop app for unlock, nothing on disk):
 *   SEQ_API_KEY_CMD="op read op://Employee/Seq/password"
 * Other examples:
 *   SEQ_API_KEY_CMD="security find-generic-password -s seq-api-key -w"   # macOS Keychain
 *   SEQ_API_KEY_CMD="secret-tool lookup service seq-api-key"             # libsecret / GNOME Keyring
 *   SEQ_API_KEY_CMD="aws secretsmanager get-secret-value --secret-id seq --query SecretString --output text"
 */
import { execSync } from 'node:child_process';

export interface ApiKeyEnv {
  /** API key supplied directly. Takes precedence over SEQ_API_KEY_CMD. */
  SEQ_API_KEY?: string;
  /** Shell command whose stdout is the API key, run once at startup. */
  SEQ_API_KEY_CMD?: string;
  /** Timeout in ms for SEQ_API_KEY_CMD (positive integer; default 30000). */
  SEQ_API_KEY_CMD_TIMEOUT_MS?: string;
  // Index signature so `process.env` (NodeJS.ProcessEnv) is assignable.
  [key: string]: string | undefined;
}

/**
 * Runs a shell command, bounded by `timeoutMs`, and returns its stdout.
 * Injected for testability. The timeout is passed in (not read from the
 * environment) so enforcement and the reported value share one source of truth.
 */
export type CommandRunner = (command: string, timeoutMs: number) => string;

/** Default timeout (ms) for SEQ_API_KEY_CMD when SEQ_API_KEY_CMD_TIMEOUT_MS is unset or invalid. */
const DEFAULT_CMD_TIMEOUT_MS = 30_000;

/**
 * Parse the configured command timeout, falling back to the default for an
 * unset, non-numeric, or non-positive value. Generous by default so an
 * interactive unlock (e.g. a 1Password biometric prompt) has time to complete.
 *
 * @param env - Environment variables
 * @returns Timeout in milliseconds
 */
function commandTimeoutMs(env: ApiKeyEnv): number {
  const raw = env.SEQ_API_KEY_CMD_TIMEOUT_MS;
  if (raw === undefined || raw.trim() === '') return DEFAULT_CMD_TIMEOUT_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CMD_TIMEOUT_MS;
}

/**
 * Default {@link CommandRunner}: runs the command via the shell and returns its
 * stdout as a UTF-8 string.
 *
 * Two hardening choices:
 * - stderr is captured (`pipe`), not inherited, so a failing secrets command
 *   can't print sensitive output straight into the MCP server's logs.
 * - the command is bounded by a timeout (see {@link commandTimeoutMs}) so a
 *   hanging tool — e.g. an unanswered biometric/SSO prompt — can't block
 *   startup indefinitely.
 *
 * The command is trusted operator configuration (like git's `credential.helper`
 * or AWS's `credential_process`), so it is intentionally run via the shell to
 * support pipelines and expansions.
 *
 * @param command - The shell command to execute
 * @param timeoutMs - Maximum time the command may run before it is killed
 * @returns The command's stdout
 */
const defaultRunner: CommandRunner = (command, timeoutMs) =>
  execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs,
  });

/**
 * Build a bounded, non-sensitive failure reason from a thrown command error.
 *
 * Never echoes `error.message` or captured stderr — either can carry the
 * command text or secret output, which may end up in logs the MCP client keeps.
 *
 * @param error - The value thrown by the command runner
 * @param timeoutMs - The configured timeout, for the timeout message
 * @returns A short, safe description of why the command failed
 */
function failureReason(error: unknown, timeoutMs: number): string {
  const e = (error ?? {}) as { status?: number; signal?: string | null; killed?: boolean; code?: string };
  if (e.killed || e.signal === 'SIGTERM' || e.code === 'ETIMEDOUT') return `timed out after ${timeoutMs}ms`;
  if (typeof e.status === 'number') return `exited with code ${e.status}`;
  if (e.signal) return `was terminated by signal ${e.signal}`;
  return 'could not be run';
}

/**
 * Resolve the Seq API key from the environment.
 *
 * Precedence:
 *  1. `SEQ_API_KEY` — used directly if set and non-empty.
 *  2. `SEQ_API_KEY_CMD` — executed via the shell; the trimmed stdout is the key.
 *     Lets the key be pulled from a secrets manager / OS keychain (e.g.
 *     1Password's `op read`) so no plaintext secret lives in config files.
 *
 * @param env - Environment variables (typically `process.env`)
 * @param run - Command executor (defaults to a real `execSync`; override in tests)
 * @returns The resolved API key, or '' if neither variable is configured
 * @throws If `SEQ_API_KEY_CMD` is set but the command fails, times out, or yields no output
 */
export function resolveApiKey(env: ApiKeyEnv, run: CommandRunner = defaultRunner): string {
  const direct = env.SEQ_API_KEY?.trim();
  if (direct) return direct;

  const command = env.SEQ_API_KEY_CMD?.trim();
  if (command) {
    // Resolve the timeout once so the value enforced by the runner and the value
    // reported on a timeout failure share a single source of truth.
    const timeoutMs = commandTimeoutMs(env);
    let output: string;
    try {
      output = run(command, timeoutMs);
    } catch (error) {
      // Report only a bounded, non-sensitive reason — see failureReason().
      throw new Error(
        `SEQ_API_KEY_CMD ${failureReason(error, timeoutMs)}. ` +
        `Run the configured command manually to see its error output.`
      );
    }
    const key = output.trim();
    if (!key) {
      throw new Error('SEQ_API_KEY_CMD produced no output; expected the API key on stdout.');
    }
    return key;
  }

  return '';
}
