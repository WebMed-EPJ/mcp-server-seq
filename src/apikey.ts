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
  // Index signature so `process.env` (NodeJS.ProcessEnv) is assignable.
  [key: string]: string | undefined;
}

/** Runs a shell command and returns its stdout. Injected for testability. */
export type CommandRunner = (command: string) => string;

const defaultRunner: CommandRunner = (command) =>
  execSync(command, {
    encoding: 'utf8',
    // Discard stdin; capture stdout (the key); let stderr surface for diagnostics.
    stdio: ['ignore', 'pipe', 'inherit'],
  });

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
 * @throws If `SEQ_API_KEY_CMD` is set but the command fails or yields no output
 */
export function resolveApiKey(env: ApiKeyEnv, run: CommandRunner = defaultRunner): string {
  const direct = env.SEQ_API_KEY?.trim();
  if (direct) return direct;

  const command = env.SEQ_API_KEY_CMD?.trim();
  if (command) {
    let output: string;
    try {
      output = run(command);
    } catch (error) {
      // Surface the command (operator-provided config, e.g. an `op://` ref), not
      // its captured output, so a leaked secret can't end up in logs via the error.
      // Guard against non-Error throws (a custom runner could throw anything).
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`SEQ_API_KEY_CMD failed: ${reason}`);
    }
    const key = output.trim();
    if (!key) {
      throw new Error('SEQ_API_KEY_CMD produced no output; expected the API key on stdout.');
    }
    return key;
  }

  return '';
}
