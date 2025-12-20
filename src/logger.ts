import { LEVELS, normalizeLevel } from './logging/levels.js';
// import { GraylogClient } from './logging/graylog';
import { stdoutWrite } from './sinks/stdout.js';
import { FileSink } from './sinks/file.js';
import { topicAllowed } from './utils/topicFilter.js';
import type { LogConfig, LevelName, ForceLogConfig, ForceLogRule, ForceDontLogConfig, ForceDontLogRule } from './types.js';
import { GraylogClient } from './logging/graylog.js'; // ← new: GELF 1.1 UDP client
import { EventEmitter } from 'events';
type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'verbose';
type Topic = string;

function buildGraylogSink(
  cfg: LogConfig
): { emit: (level: Level, topic: string, message: string, meta: Record<string, unknown>) => void; close: () => void } | null {
  const g = (cfg.sinks as any)?.graylog;
  if (!g || g.enabled !== true || !g.host || !g.port) return null;

  const client = new GraylogClient({
    host: String(g.host),
    port: Number(g.port) || 12201,
    hostName: typeof g.hostName === 'string' ? g.hostName : undefined,
    chunkSize: typeof g.chunkSize === 'number' ? g.chunkSize : undefined,
    enabled: true,
  });

  return {
    emit(level, topic, message, meta) {
      // Pass through as-is. The client:
      // - prefixes extras with "_" (e.g., _topic, _router, _script)
      // - sets GELF required fields & compression/chunking
      client.send(level, message, topic, meta);
    },
    close() {
      client.close();
    },
  };
}

/* ----------------------------- ForceLog support ---------------------------- */
/**
 * Minimal, backwards-compatible "force log by regex" implementation.
 * - Reads optional cfg at (cfg as any).forceLog
 * - If any rule matches (checking msg or specified fields), bypasses:
 *   - global/topic min level
 *   - per-sink min level
 *   - per-sink topic filters
 * - Still respects sink enabled flags.
 * - Annotates events with forced=true and forcedRule=<index>.
 *
 * Shape expected (no type dependency outside this file):
 *  {
 *    forceLog?: {
 *      rules: Array<{ pattern: string; flags?: string; fields?: string[] }>;
 *      maxRules?: number; // default 20
 *    }
 *  }
 *
 * "fields" is optional; if omitted or [], defaults to ["msg"].
 */


type CompiledForceRule = { re: RegExp; fields: string[] };

function valToString(v: unknown): string {
  if (v == null) return '';
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint') return String(v);
  if (t === 'object') {
    try {
      // Favor custom toString for tiny scalar-like values
      const s = (v as any).toString?.();
      if (typeof s === 'string' && s !== '[object Object]') return s;
    } catch {}
  }
  return '';
}

function getByPath(obj: any, path: string): unknown {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/* -------------------------------------------------------------------------- */

export class Logger extends EventEmitter {
  private cfg: LogConfig;
  private graylog?: GraylogClient;
  private fileSink?: FileSink;
  private meta: { serviceName: string; routerName?: string; instanceId?: string };

  // compiled force rules cache (local to this instance)
  private forceRules: CompiledForceRule[] = [];
  private forceDontLogRules: CompiledForceRule[] = [];

  constructor(serviceName: string, cfg: LogConfig, routerName?: string, instanceId?: string) {
    super();
    this.meta = { serviceName, routerName, instanceId };
    this.cfg = this.normalize(cfg);
    this.applyForceRules();
    this.setupSinks();
  }

  update(next: Partial<LogConfig>) {
    const merged: LogConfig = {
      globalLevel: normalizeLevel(next.globalLevel ?? this.cfg.globalLevel),
      topicLevels: { ...this.cfg.topicLevels, ...(next.topicLevels || {}) },
      sinks: { ...this.cfg.sinks, ...(next.sinks || {}) } as LogConfig['sinks'],
      forceDontLog: next.forceDontLog || this.cfg.forceDontLog,
      forceLog: next.forceLog || this.cfg.forceLog
    };
    this.cfg = this.normalize(merged);
    this.applyForceRules();
    this.setupSinks();
  }

  getConfig(): LogConfig { return this.cfg; }

  private normalize(cfg: LogConfig): LogConfig {
    return {
      ...cfg,
      globalLevel: normalizeLevel(cfg.globalLevel),
      topicLevels: Object.fromEntries(Object.entries(cfg.topicLevels || {}).map(([k, v]) => [k, normalizeLevel(v)])),
      sinks: {
        ...cfg.sinks,
        stdout: { ...cfg.sinks.stdout, minLevel: normalizeLevel(cfg.sinks.stdout.minLevel) },
        file: { ...cfg.sinks.file, minLevel: normalizeLevel(cfg.sinks.file.minLevel) },
        graylog: { ...cfg.sinks.graylog, minLevel: normalizeLevel(cfg.sinks.graylog.minLevel) }
      },
      forceDontLog: cfg.forceDontLog || undefined,
      forceLog: cfg.forceLog || undefined
    };
  }

  private setupSinks() {
    // Graylog
    this.graylog = this.cfg.sinks.graylog.enabled
      ? new GraylogClient({
          host: this.cfg.sinks.graylog.host,
          port: this.cfg.sinks.graylog.port,
          // defaultFields: {
          //   script: this.meta.serviceName,
          //   router: this.meta.routerName,
          //   instance: this.meta.instanceId,
          //   ...(this.cfg.sinks.graylog.extra || {})
          // }
        })
      : undefined;

    // File
    this.fileSink = this.cfg.sinks.file.enabled
      ? new FileSink(this.cfg.sinks.file.filePath, this.cfg.sinks.file.topicFilePath)
      : undefined;
  }

  private minLevelFor(topic: Topic): LevelName {
    const t = this.cfg.topicLevels?.[topic];
    if (t) return t;
    return this.cfg.globalLevel;
  }

  private allowedFor(topic: Topic, level: LevelName) {
    const n = this.minLevelFor(topic);
    return LEVELS[level] >= LEVELS[n];
  }

  /**
   * Compile force rules from cfg (if present).
   * Reads from (this.cfg as any).forceLog to avoid changing external types.
   */
  private applyForceRules() {
    const fl: ForceLogConfig | undefined = (this.cfg as any).forceLog;
    const fd: ForceDontLogConfig | undefined = (this.cfg as any).forceDontLog;
    this.forceRules = [];
    this.forceDontLogRules = [];

    if (fl && Array.isArray(fl.rules) && fl.rules.length > 0) {
      const max = typeof fl.maxRules === 'number' && fl.maxRules > 0 ? fl.maxRules : 20;
      for (const rule of fl.rules.slice(0, max)) {
        try {
          if (!rule?.pattern) continue;
          const re = new RegExp(rule.pattern, rule.flags || undefined);
          const fields = Array.isArray(rule.fields) && rule.fields.length > 0 ? rule.fields : ['msg'];
          this.forceRules.push({ re, fields });
        } catch {}
      }
    }

    if (fd && Array.isArray(fd.rules) && fd.rules.length > 0) {
      const max = typeof fd.maxRules === 'number' && fd.maxRules > 0 ? fd.maxRules : 20;
      for (const rule of fd.rules.slice(0, max)) {
        try {
          if (!rule?.pattern) continue;
          const re = new RegExp(rule.pattern, rule.flags || undefined);
          const fields = Array.isArray(rule.fields) && rule.fields.length > 0 ? rule.fields : ['msg'];
          this.forceDontLogRules.push({ re, fields });
        } catch {}
      }
    }
  }

  /**
   * Check if this event should be forcibly logged according to compiled rules.
   * Returns the matched rule index or -1 if not forced.
   */
  private forceMatch(event: Record<string, unknown>): number {
    if (this.forceRules.length === 0) return -1;
    for (let i = 0; i < this.forceRules.length; i++) {
      const { re, fields } = this.forceRules[i];
      let haystack = '';
      for (const f of fields) {
        const v = getByPath(event, f);
        if (v !== undefined) {
          const s = valToString(v);
          if (s) haystack += (haystack ? ' ' : '') + s;
        }
      }
      if (haystack && re.test(haystack)) return i;
    }
    return -1;
  }

  private forceDontLogMatch(event: Record<string, unknown>): number {
    if (this.forceDontLogRules.length === 0) return -1;
    for (let i = 0; i < this.forceDontLogRules.length; i++) {
      const { re, fields } = this.forceDontLogRules[i];
      let haystack = '';
      for (const f of fields) {
        const v = getByPath(event, f);
        if (v !== undefined) {
          const s = valToString(v);
          if (s) haystack += (haystack ? ' ' : '') + s;
        }
      }
      if (haystack && re.test(haystack)) return i;
    }
    return -1;
  }

  log(level: LevelName, topic: Topic, msg: string, data: Record<string, unknown> = {}) {
    // Construct a lightweight event for matching (includes msg/topic/level/meta+data)
    // Note: keep it shallow to stay cheap.
    // console.log('Here', level, topic, msg, data);
    const eventBase: Record<string, unknown> = {
      msg,
      topic,
      level,
      script: this.meta.serviceName,
      router: this.meta.routerName,
      instance: this.meta.instanceId,
      ...data
    };

    // Deny check FIRST
    const matchedDenyRule = this.forceDontLogMatch(eventBase);
    if (matchedDenyRule >= 0) {
      return; // completely skip logging
    }

    // Allow check SECOND
    const matchedAllowRule = this.forceMatch(eventBase);
    const forced = matchedAllowRule >= 0;

    if (!forced && !this.allowedFor(topic, level)) return;


    // If not forced, apply the normal global/topic min-level gate early.
    if (!forced && !this.allowedFor(topic, level)) return;

    // Prepare sink-shared flags without mutating caller's data
    const forcedExtras = forced ? { forced: true, forcedRule: matchedAllowRule } : undefined;

    // stdout
    if (this.cfg.sinks.stdout.enabled) {
      if (forced || (LEVELS[level] >= LEVELS[this.cfg.sinks.stdout.minLevel] && topicAllowed(topic, this.cfg.sinks.stdout.topics))) {
        const devPretty = !!this.cfg.sinks.stdout.pretty && (process.env.NODE_ENV === 'development');
        const outData = forcedExtras ? { ...data, ...forcedExtras } : data;
        const outBlock = stdoutWrite(devPretty, topic, level, msg, outData);
        this.emit('stdout', outBlock, topic, level, msg, outData);
      }
    }

    // file (JSON lines)
    if (this.fileSink) {
      if (forced || (LEVELS[level] >= LEVELS[this.cfg.sinks.file.minLevel] && topicAllowed(topic, this.cfg.sinks.file.topics))) {
        const base = { ts: Math.floor(Date.now()/1000), level, topic, msg, ...(forcedExtras || {}), ...data };
        this.fileSink.write(topic, JSON.stringify(base)+'\n');
      }
    }

    // graylog
    if (this.graylog) {
      if (forced || (LEVELS[level] >= LEVELS[this.cfg.sinks.graylog.minLevel] && topicAllowed(topic, this.cfg.sinks.graylog.topics))) {
        // Include forced flags in GELF additional fields
        const gelfData = forcedExtras ? { ...data, ...forcedExtras } : data;
        /*
        (method) GraylogClient.send(level: Level, msg: string, topic: string, meta: Record<string, unknown>, serviceName?: string, routerName?: string): void

        */
        // this.graylog.send(LEVELS[level], msg, topic, { ...gelfData, topic, script: this.meta.serviceName, router: this.meta.routerName });
        this.graylog.send(level, msg, topic, { ...gelfData, topic, script: this.meta.serviceName, router: this.meta.routerName || gelfData.router });
      }
    }
  }

  // convenience wrappers
  fatal(topic: Topic, msg: string, data?: Record<string, unknown>) { this.log('fatal', topic, msg, data); }
  error(topic: Topic, msg: string, data?: Record<string, unknown>) { this.log('error', topic, msg, data); }
  warn(topic: Topic, msg: string, data?: Record<string, unknown>) { this.log('warn', topic, msg, data); }
  info(topic: Topic, msg: string, data?: Record<string, unknown>) { this.log('info', topic, msg, data); }
  debug(topic: Topic, msg: string, data?: Record<string, unknown>) { this.log('debug', topic, msg, data); }
  trace(topic: Topic, msg: string, data?: Record<string, unknown>) { this.log('trace', topic, msg, data); }
  verbose(topic: Topic, msg: string, data?: Record<string, unknown>) { this.log('verbose', topic, msg, data); }
}
