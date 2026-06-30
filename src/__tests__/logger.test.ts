import {
  createLogger,
  errorFields,
  parseLogLevel,
  sanitizeLogPath,
} from '../logger.js';

describe('parseLogLevel', () => {
  it('accepts the known levels case-insensitively', () => {
    expect(parseLogLevel('debug')).toBe('debug');
    expect(parseLogLevel('INFO')).toBe('info');
    expect(parseLogLevel(' Warn ')).toBe('warn');
    expect(parseLogLevel('error')).toBe('error');
    expect(parseLogLevel('silent')).toBe('silent');
  });

  it('falls back to info for empty/unknown values', () => {
    expect(parseLogLevel(undefined)).toBe('info');
    expect(parseLogLevel('')).toBe('info');
    expect(parseLogLevel('verbose')).toBe('info');
  });
});

describe('sanitizeLogPath', () => {
  it('returns paths without a query string unchanged', () => {
    expect(sanitizeLogPath('/mcp')).toBe('/mcp');
    expect(sanitizeLogPath('/healthz')).toBe('/healthz');
  });

  it('masks every query-string VALUE but keeps the keys', () => {
    // The OAuth callback carries the authorization code + state — both must be
    // masked so they never reach the logs (GDPR / token-leak prevention).
    expect(sanitizeLogPath('/callback?code=abc123&state=xyz')).toBe(
      '/callback?code=<redacted>&state=<redacted>',
    );
  });

  it('handles valueless and trailing params without leaking', () => {
    expect(sanitizeLogPath('/x?flag&a=1')).toBe('/x?flag&a=<redacted>');
    expect(sanitizeLogPath('/x?')).toBe('/x');
  });
});

describe('errorFields', () => {
  it('logs the message + name for errors without an HTTP status', () => {
    const fields = errorFields(new Error('REMOTE_PUBLIC_URL must be https'));
    expect(fields).toEqual({ error: 'REMOTE_PUBLIC_URL must be https', errorName: 'Error' });
  });

  it('suppresses the message body for errors carrying an HTTP status', () => {
    // An upstream Seq error message can embed the raw response body (possible
    // PII), so only name + status + a fixed summary are logged — never .message.
    const err = Object.assign(new Error('500: <fnr 01017012345 in body>'), { status: 500 });
    const fields = errorFields(err);
    expect(fields).toEqual({ errorName: 'Error', status: 500, error: 'request failed (HTTP 500)' });
    expect(JSON.stringify(fields)).not.toContain('01017012345');
  });

  it('stringifies non-Error throwables', () => {
    expect(errorFields('boom')).toEqual({ error: 'boom' });
  });
});

describe('createLogger', () => {
  it('emits to the injected sink only at/above the threshold', () => {
    const lines: string[] = [];
    const log = createLogger({ level: 'warn', sink: (l) => lines.push(l), now: () => 'T' });
    log.debug('d');
    log.info('i');
    log.warn('w', { a: 1 });
    log.error('e');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('WARN');
    expect(lines[0]).toContain('w');
    expect(lines[0]).toContain('{"a":1}');
    expect(lines[1]).toContain('ERROR');
  });
});
