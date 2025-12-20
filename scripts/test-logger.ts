// scripts/test-logger.ts
/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import { Logger } from '../src/logger';
import type { LogConfig } from '../src/types';

// ---------- helpers ----------
function wait(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function resetFile(p: string) {
  try { fs.unlinkSync(p); } catch {}
  try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch {}
}

// ---------- config under test ----------
const FILE = '/tmp/predictive-test.log';
const TOPIC_FILE = '/tmp/predictive-%TOPIC%.log';

const cfg: LogConfig & {
  // Strong typing optional: the logger reads these via cfg as any
  forceLog?: {
    rules: Array<{ pattern: string; flags?: string; fields?: string[] }>;
    maxRules?: number;
  };
  forceDontLog?: {
    rules: Array<{ pattern: string; flags?: string; fields?: string[] }>;
    maxRules?: number;
  };
} = {
  globalLevel: 'info',
  topicLevels: {
    http: 'info',
    auth: 'debug',
  },
  sinks: {
    stdout: { enabled: true, minLevel: 'info', pretty: true },
    file:   { enabled: true, minLevel: 'debug', filePath: FILE, topicFilePath: TOPIC_FILE },
    graylog:{ enabled: false, minLevel: 'info', host: '127.0.0.1', port: 12201 },
  },
  // Allow list: if matched, bypass all filters (except sink enabled)
  forceLog: {
    maxRules: 20,
    rules: [
      // Force logs that start with CRITICAL: (fields default to ["msg"])
      { pattern: '^CRITICAL:' },
      // Force logs mentioning "payment failed" anywhere in msg/topic/orderId
      { pattern: 'payment\\s+failed', flags: 'i', fields: ['msg', 'topic', 'orderId'] },
      // Force logs when agent equals/manches "manuele" (case-insensitive) in the "agent" field
      { pattern: 'manuele', flags: 'i', fields: ['agent'] },
    ],
  },
  // Deny list: if matched, drop entirely (takes precedence over forceLog)
  forceDontLog: {
    rules: [
      // Drop periodic heartbeats regardless of level/topic
      { pattern: 'heartbeat', flags: 'i', fields: ['msg'] },
    ],
  },
};

// ---------- test plan ----------
async function main() {
  resetFile(FILE);

  const logger = new Logger('test-service', cfg, 'router-1', 'instance-1');

  // 1) Below-level message (debug < info) — should NOT log
  logger.debug('startup', 'debug below info should be dropped');

  // 2) Forced by pattern "payment failed" (forceLog) — SHOULD log even at debug
  logger.debug('payments', 'payment failed for order', { orderId: 'A1' });

  // 3) Denied by forceDontLog ("heartbeat") — should NOT log even at info
  logger.info('metrics', 'heartbeat tick');

  // 4) Forced by agent field "manuele" — SHOULD log even at trace
  logger.trace('operators', 'agent login', { agent: 'Manuele' });

  // 5) Normal allowed info — SHOULD log
  logger.info('http', 'GET /health ok', { status: 200 });

  // 6) Matches both CRITICAL (force) and heartbeat (deny) — deny wins; should NOT log
  logger.error('system', 'CRITICAL heartbeat');

  // Let file sink flush
  await wait(1000);

  // Load JSON lines from file sink
  let lines: string[] = [];
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    lines = raw.split('\n').filter(Boolean);
  } catch (err) {
    console.error('Failed reading log file:', err);
    process.exit(1);
  }

  const entries = lines.map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter((x): x is Record<string, any> => !!x);

  // ---------- assertions ----------
  function hasMsg(s: string) {
    return entries.some(e => e.msg === s);
  }
  function findMsg(s: string) {
    return entries.find(e => e.msg === s);
  }

  const results: Array<{ name: string; pass: boolean; details?: string }> = [];

  // A) below-level debug dropped
  results.push({
    name: 'below-level debug is dropped',
    pass: !hasMsg('debug below info should be dropped'),
  });

  // B) forced payment failure present and marked forced
  {
    const e = findMsg('payment failed for order');
    results.push({
      name: 'forceLog (payment failed) present',
      pass: !!e && e.level === 'debug',
      details: e ? `forced=${e.forced} rule=${e.forcedRule}` : 'not found',
    });
    results.push({
      name: 'forceLog annotated (forced=true)',
      pass: !!e && e.forced === true,
    });
  }

  // C) heartbeat denied
  results.push({
    name: 'forceDontLog (heartbeat) is dropped',
    pass: !hasMsg('heartbeat tick'),
  });

  // D) agent=manuele forced
  {
    const e = findMsg('agent login');
    results.push({
      name: 'forceLog (agent=manuele) present at trace',
      pass: !!e && e.level === 'trace',
      details: e ? `forced=${e.forced} agent=${e.agent}` : 'not found',
    });
  }

  // E) normal allowed info present
  results.push({
    name: 'normal info log present',
    pass: !!findMsg('GET /health ok'),
  });

  // F) conflict (CRITICAL + heartbeat) denied
  results.push({
    name: 'forceDontLog overrides forceLog (CRITICAL heartbeat) is dropped',
    pass: !hasMsg('CRITICAL heartbeat'),
  });

  // ---------- report ----------
  const ok = results.every(r => r.pass);
  console.log('\n--- Logger Package Test Results ---');
  for (const r of results) {
    console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.details ? ' — ' + r.details : ''}`);
  }
  console.log('-----------------------------------\n');
  if (!ok) {
    console.error('Some tests failed.');
    process.exit(2);
  } else {
    console.log('All tests passed.');
  }
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
