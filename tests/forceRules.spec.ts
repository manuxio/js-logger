import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLogger, getLogger, setConfig } from '../src/index';

let originalWrite: any;
let lines: string[];

function startCapture() {
  lines = [];
  originalWrite = process.stdout.write;
  // @ts-expect-error override
  process.stdout.write = (chunk: any, ..._args: any[]) => {
    const s = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    s.split(/\r?\n/).forEach((l) => l.trim() && lines.push(l.trim()));
    return true;
  };
}
function stopCapture() {
  if (originalWrite) process.stdout.write = originalWrite;
}
function parseJsonLines() {
  return lines.map((l) => { try { return JSON.parse(l); } catch { return { __raw: l }; } });
}

async function initBaseline(overrides: any = {}) {
  await createLogger({
    serviceName: 'logger-tests',
    routerName: 'test-router',
    instanceId: 'vitest',
    initialConfig: {
      serviceName: 'logger-tests',
      routerName: 'test-router',
      globalMinLevel: 'error',
      sinks: {
        stdout: { enabled: true, mode: 'json', minLevel: 'error' },
        file:   { enabled: false, minLevel: 'info', path: '' },
        graylog:{ enabled: false, minLevel: 'info', host: '', port: 0 },
      },
      forceLog: { rules: [] },
      forceDontLog: { rules: [] },
      ...overrides,
    },
  });
}

beforeEach(async () => {
  await initBaseline();
  startCapture();
});
afterEach(() => stopCapture());

describe('force rules', () => {
  it('forceLog allows a normally-blocked INFO', async () => {
    setConfig({
      serviceName: 'logger-tests',
      globalMinLevel: 'error',
      sinks: {
        stdout: { enabled: true, mode: 'json', minLevel: 'error' },
        file:   { enabled: false, minLevel: 'info', path: '' },
        graylog:{ enabled: false, minLevel: 'info', host: '', port: 0 },
      },
      forceLog:     { rules: [{ pattern: '^2', fields: ['status'] }] },
      forceDontLog: { rules: [] },
    });

    const log = getLogger('http');
    log.info({ status: 202, msg: 'ok' }, 'http_ok');

    const out = parseJsonLines();
    expect(out.length).toBe(1);
    const e: any = out[0];
    expect(e.level).toBe('info');
    expect(e.topic).toBe('http');
    expect(e.status).toBe(202);
  });

  it('forceDontLog drops even when forceLog also matches (deny precedence)', async () => {
    setConfig({
      serviceName: 'logger-tests',
      globalMinLevel: 'error',
      sinks: {
        stdout: { enabled: true, mode: 'json', minLevel: 'error' },
        file:   { enabled: false, minLevel: 'info', path: '' },
        graylog:{ enabled: false, minLevel: 'info', host: '', port: 0 },
      },
      forceLog:     { rules: [{ pattern: 'ok', fields: ['msg'] }] },
      forceDontLog: { rules: [{ pattern: '^2', fields: ['status'] }] },
    });

    const log = getLogger('http');
    log.info({ status: 202, msg: 'ok' }, 'http_ok');

    const out = parseJsonLines();
    expect(out.length).toBe(0);
  });

  it('OR semantics in forceLog: any matching rule allows', async () => {
    setConfig({
      serviceName: 'logger-tests',
      globalMinLevel: 'error',
      sinks: {
        stdout: { enabled: true, mode: 'json', minLevel: 'error' },
        file:   { enabled: false, minLevel: 'info', path: '' },
        graylog:{ enabled: false, minLevel: 'info', host: '', port: 0 },
      },
      forceLog: {
        rules: [
          { pattern: 'not-this', fields: ['msg'] },
          { pattern: '^pin_',   fields: ['topic'] }, // matches
        ],
      },
      forceDontLog: { rules: [] },
    });

    const log = getLogger('pin_valid');
    log.debug({ user: 'u1', msg: 'pin ok' }, 'pin_ok');

    const out = parseJsonLines();
    expect(out.length).toBe(1);
    const e: any = out[0];
    expect(e.level).toBe('debug');
    expect(e.topic).toBe('pin_valid');
  });

  it('OR semantics in forceDontLog: any matching rule denies', async () => {
    setConfig({
      serviceName: 'logger-tests',
      globalMinLevel: 'info',
      sinks: {
        stdout: { enabled: true, mode: 'json', minLevel: 'info' },
        file:   { enabled: false, minLevel: 'info', path: '' },
        graylog:{ enabled: false, minLevel: 'info', host: '', port: 0 },
      },
      forceLog:     { rules: [] },
      forceDontLog: { rules: [{ pattern: '^5', fields: ['status'] }, { pattern: '^2', fields: ['status'] }] },
    });

    const log = getLogger('http');
    log.warn({ status: 202, msg: 'ok' }, 'http_warn');

    const out = parseJsonLines();
    expect(out.length).toBe(0);
  });
});
