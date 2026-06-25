import { resolveApiKey, type CommandRunner } from '../apikey.js';

/** Records the commands it was asked to run and returns a canned/computed result. */
function spyRunner(impl: (cmd: string) => string): CommandRunner & { calls: string[] } {
  const calls: string[] = [];
  const fn = ((cmd: string) => {
    calls.push(cmd);
    return impl(cmd);
  }) as CommandRunner & { calls: string[] };
  fn.calls = calls;
  return fn;
}

describe('resolveApiKey', () => {
  it('uses SEQ_API_KEY directly when set', () => {
    const run = spyRunner(() => 'unused');
    expect(resolveApiKey({ SEQ_API_KEY: 'direct-key' }, run)).toBe('direct-key');
    expect(run.calls).toHaveLength(0);
  });

  it('trims surrounding whitespace from a direct key', () => {
    expect(resolveApiKey({ SEQ_API_KEY: '  spaced-key\n' })).toBe('spaced-key');
  });

  it('prefers SEQ_API_KEY over SEQ_API_KEY_CMD when both are set', () => {
    const run = spyRunner(() => 'from-cmd');
    expect(resolveApiKey({ SEQ_API_KEY: 'direct', SEQ_API_KEY_CMD: 'op read ...' }, run)).toBe('direct');
    expect(run.calls).toHaveLength(0);
  });

  it('runs SEQ_API_KEY_CMD and uses its trimmed stdout', () => {
    const run = spyRunner(() => 'key-from-1password\n');
    expect(resolveApiKey({ SEQ_API_KEY_CMD: 'op read op://Employee/Seq/password' }, run)).toBe('key-from-1password');
    expect(run.calls).toEqual(['op read op://Employee/Seq/password']);
  });

  it('falls back to SEQ_API_KEY_CMD when SEQ_API_KEY is empty/whitespace', () => {
    const run = spyRunner(() => 'cmd-key');
    expect(resolveApiKey({ SEQ_API_KEY: '   ', SEQ_API_KEY_CMD: 'fetch' }, run)).toBe('cmd-key');
    expect(run.calls).toEqual(['fetch']);
  });

  it('returns an empty string when neither variable is set', () => {
    expect(resolveApiKey({})).toBe('');
  });

  it('throws a sanitized error (no command text or stderr) when the command fails', () => {
    const run = spyRunner(() => {
      const e = new Error('op: not signed in — super-secret-token') as Error & { status?: number };
      e.status = 1;
      throw e;
    });
    try {
      resolveApiKey({ SEQ_API_KEY_CMD: 'op read op://Employee/Seq/password' }, run);
      throw new Error('expected resolveApiKey to throw');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/SEQ_API_KEY_CMD exited with code 1/);
      // Must not leak the command text or the command's stderr/message.
      expect(msg).not.toContain('super-secret-token');
      expect(msg).not.toContain('op read');
    }
  });

  it('reports a timeout when the command is killed', () => {
    const run = spyRunner(() => {
      const e = new Error('killed') as Error & { killed?: boolean; signal?: string };
      e.killed = true;
      e.signal = 'SIGTERM';
      throw e;
    });
    expect(() => resolveApiKey({ SEQ_API_KEY_CMD: 'sleep 999', SEQ_API_KEY_CMD_TIMEOUT_MS: '5000' }, run))
      .toThrow(/timed out after 5000ms/);
  });

  it('throws when the command produces no output', () => {
    const run = spyRunner(() => '\n  \n');
    expect(() => resolveApiKey({ SEQ_API_KEY_CMD: 'echo' }, run))
      .toThrow(/produced no output/);
  });
});
