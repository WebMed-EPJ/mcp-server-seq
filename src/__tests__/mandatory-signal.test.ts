import { jest } from '@jest/globals';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { silentLogger } from '../logger.js';
import {
  applyMandatorySignal,
  mandatorySignalForHost,
  mandatorySignalForUrl,
  mandatorySignalNotice,
  type MandatorySignal,
} from '../mandatory-signal.js';

const PROD_SEQ = 'https://seq.intern.webmed.no';
const TEST_SEQ = 'https://seq.k8s.webmedepj.no';
const NO_DEBUG = 'signal-6612';

const prodSignal = (): MandatorySignal => {
  const signal = mandatorySignalForUrl(PROD_SEQ);
  if (!signal) throw new Error('production must have a mandatory signal');
  return signal;
};

describe('mandatorySignalForUrl', () => {
  it('forces the No Debug signal on production Seq', () => {
    expect(mandatorySignalForUrl(PROD_SEQ)?.id).toBe(NO_DEBUG);
  });

  it('matches production however the host is spelled', () => {
    // Case, trailing dot and port are all the same host to DNS; each was a way
    // past a plain string compare.
    expect(mandatorySignalForUrl('https://SEQ.Intern.WebMed.no')?.id).toBe(NO_DEBUG);
    expect(mandatorySignalForUrl('https://seq.intern.webmed.no.')?.id).toBe(NO_DEBUG);
    expect(mandatorySignalForUrl('https://seq.intern.webmed.no:8443/')?.id).toBe(NO_DEBUG);
  });

  it('forces nothing on test, local or unknown instances', () => {
    // A signal id belongs to the instance that issued it: signal-6612 is a row
    // in production's database, so sending it elsewhere would break queries
    // rather than narrow them.
    expect(mandatorySignalForUrl(TEST_SEQ)).toBeNull();
    expect(mandatorySignalForUrl('http://localhost:5341')).toBeNull();
    expect(mandatorySignalForUrl('https://seq.somewhere-new.webmed.no')).toBeNull();
    expect(mandatorySignalForUrl('not a url')).toBeNull();
    expect(mandatorySignalForUrl(undefined)).toBeNull();
    expect(mandatorySignalForHost(null)).toBeNull();
  });

  it('cannot be switched off or redirected by the environment', () => {
    // The whole point of hard-coding it. These are the variables that already
    // steer the other host-keyed control (the redaction fence) plus the ones a
    // future operator would reach for first.
    const env = {
      SEQ_MANDATORY_SIGNAL: '',
      SEQ_MANDATORY_SIGNALS: '',
      SEQ_DISABLE_MANDATORY_SIGNAL: 'true',
      SEQ_NO_DEBUG_SIGNAL: '',
      SEQ_NON_PRODUCTION_HOSTS: 'seq.intern.webmed.no',
      SEQ_REDACTION_ENABLED: 'false',
    };
    Object.assign(process.env, env);
    try {
      expect(mandatorySignalForUrl(PROD_SEQ)?.id).toBe(NO_DEBUG);
    } finally {
      for (const key of Object.keys(env)) delete process.env[key];
    }
  });
});

describe('applyMandatorySignal', () => {
  it('scopes a call that asked for no signal at all', () => {
    expect(applyMandatorySignal(undefined, prodSignal())).toBe(NO_DEBUG);
  });

  it('intersects with the signals the caller asked for', () => {
    expect(applyMandatorySignal('signal-662', prodSignal())).toBe(`${NO_DEBUG},signal-662`);
    expect(applyMandatorySignal('signal-662,signal-663', prodSignal()))
      .toBe(`${NO_DEBUG},signal-662,signal-663`);
  });

  it('tolerates whitespace and empty entries in the caller argument', () => {
    expect(applyMandatorySignal(' signal-662 , , signal-663 ', prodSignal()))
      .toBe(`${NO_DEBUG},signal-662,signal-663`);
    expect(applyMandatorySignal('   ', prodSignal())).toBe(NO_DEBUG);
  });

  it('does not send the mandatory signal twice when the caller names it', () => {
    expect(applyMandatorySignal(NO_DEBUG, prodSignal())).toBe(NO_DEBUG);
    expect(applyMandatorySignal(`signal-662,${NO_DEBUG.toUpperCase()}`, prodSignal()))
      .toBe(`${NO_DEBUG},signal-662`);
  });

  it('leaves the caller argument untouched where no signal is mandatory', () => {
    expect(applyMandatorySignal('signal-662', null)).toBe('signal-662');
    expect(applyMandatorySignal(undefined, null)).toBeUndefined();
  });
});

describe('mandatorySignalNotice', () => {
  it('names the signal, its effect and that it is not optional', () => {
    const notice = mandatorySignalNotice(prodSignal());
    expect(notice).toContain('No Debug');
    expect(notice).toContain(NO_DEBUG);
    expect(notice).toContain('cannot be switched off');
  });
});

/**
 * The unit tests above pin the rule; these pin that the rule is actually on the
 * wire. They boot the real MCP server over an in-memory transport with `fetch`
 * stubbed, and read the URL the server built for Seq.
 */
describe('the server sends the mandatory signal to Seq', () => {
  const originalFetch = global.fetch;
  let requestedUrls: string[] = [];

  beforeEach(() => {
    requestedUrls = [];
    global.fetch = (async (input: RequestInfo | URL) => {
      requestedUrls.push(input.toString());
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetModules();
    delete process.env.SEQ_BASE_URL;
  });

  async function callTool(baseUrl: string, name: string, args: Record<string, unknown>) {
    process.env.SEQ_BASE_URL = baseUrl;
    jest.resetModules(); // SEQ_BASE_URL is read when server.ts loads
    const { createSeqServer } = await import('../server.js');
    const server = createSeqServer(silentLogger);
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      await client.callTool({ name, arguments: args });
    } finally {
      await client.close();
      await server.close();
    }
    return requestedUrls.map((url) => new URL(url).searchParams.get('signal'));
  }

  it('scopes get_events on production, with and without a caller signal', async () => {
    expect(await callTool(PROD_SEQ, 'get_events', { range: '15m' })).toEqual([NO_DEBUG]);
    requestedUrls = [];
    expect(await callTool(PROD_SEQ, 'get_events', { range: '15m', signal: 'signal-662' }))
      .toEqual([`${NO_DEBUG},signal-662`]);
  });

  it('scopes sql_query on production', async () => {
    expect(await callTool(PROD_SEQ, 'sql_query', { query: 'select count(*) as n from stream', range: '15m' }))
      .toEqual([NO_DEBUG]);
  });

  it('leaves calls against the test instance unscoped', async () => {
    expect(await callTool(TEST_SEQ, 'get_events', { range: '15m' })).toEqual([null]);
  });

  it('tells the model about the scope in the tool description', async () => {
    process.env.SEQ_BASE_URL = PROD_SEQ;
    jest.resetModules();
    const { createSeqServer } = await import('../server.js');
    const server = createSeqServer(silentLogger);
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const tools = (await client.listTools()).tools;
      for (const name of ['get_events', 'sql_query']) {
        expect(tools.find((t) => t.name === name)?.description).toContain(NO_DEBUG);
      }
    } finally {
      await client.close();
      await server.close();
    }
  });
});
