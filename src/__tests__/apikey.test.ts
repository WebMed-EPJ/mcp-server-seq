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
    expect(resolveApiKey({ SEQ_API_KEY_CMD: 'op read op://Private/Seq/api-key' }, run)).toBe('key-from-1password');
    expect(run.calls).toEqual(['op read op://Private/Seq/api-key']);
  });

  it('falls back to SEQ_API_KEY_CMD when SEQ_API_KEY is empty/whitespace', () => {
    const run = spyRunner(() => 'cmd-key');
    expect(resolveApiKey({ SEQ_API_KEY: '   ', SEQ_API_KEY_CMD: 'fetch' }, run)).toBe('cmd-key');
    expect(run.calls).toEqual(['fetch']);
  });

  it('returns an empty string when neither variable is set', () => {
    expect(resolveApiKey({})).toBe('');
  });

  it('throws a clear error when the command fails', () => {
    const run = spyRunner(() => { throw new Error('op: not signed in'); });
    expect(() => resolveApiKey({ SEQ_API_KEY_CMD: 'op read ...' }, run))
      .toThrow(/SEQ_API_KEY_CMD failed: op: not signed in/);
  });

  it('throws when the command produces no output', () => {
    const run = spyRunner(() => '\n  \n');
    expect(() => resolveApiKey({ SEQ_API_KEY_CMD: 'echo' }, run))
      .toThrow(/produced no output/);
  });
});
