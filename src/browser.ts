export * from './types.js';
import type { LoggerInitOptionsInBrowser, LogConfigInBrowser } from './types.js';
import { BrowserLogger } from './logger.browser.js';

let singleton: BrowserLogger | null = null;

export function create(appName: string, cfg: LogConfigInBrowser) {
  if (singleton) return singleton;
  singleton = new BrowserLogger(appName, cfg);
  return singleton;
}

export function get(): BrowserLogger {
  if (!singleton) throw new Error('Logger not initialized. Call createLogger() first.');
  return singleton;
}

export function setConfig(cfg: LogConfigInBrowser) {
  if (!singleton) throw new Error('Logger not initialized');
  singleton.update(cfg);
}


export interface TopicLogger {
  fatal(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  error(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  warn (msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  info (msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  debug(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  trace(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  verbose(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
}

// Re-export useful types/utilities that are browser-safe
export type { LevelName, LogConfigInBrowser as LogConfig, LoggerInitOptionsInBrowser as LoggerInitOptions} from './types';
export { normalizeLevel, coerceTopicLevels } from './logging/levels' ;

/** Initialize the singleton logger (browser-safe).
 *  Supply a full LogConfig object; no environment or Mongo providers here.
 */
export function createLogger(opts: LoggerInitOptionsInBrowser) {
  const defaultConfig : LogConfigInBrowser = {
    globalLevel: 'info',
    topicLevels: {},
    sinks: {
      console: { enabled: true, minLevel: "info", pretty: true }
    }
  }

  const cfg = opts.initialConfig || defaultConfig;
  return create(opts.appName, cfg);
}


/** Get the singleton logger or a topic-bound facade. */
export function getLogger(topic?: string): any /* Logger | TopicLogger */ {
  const logger = get();
  if (!topic) return logger;
  return {
    fatal: (msg: string, data: Record<string, unknown> = {}) => logger.fatal(topic, msg, data),
    error: (msg: string, data: Record<string, unknown> = {}) => logger.error(topic, msg, data),
    warn:  (msg: string, data: Record<string, unknown> = {}) => logger.warn(topic, msg, data),
    info:  (msg: string, data: Record<string, unknown> = {}) => logger.info(topic, msg, data),
    debug: (msg: string, data: Record<string, unknown> = {}) => logger.debug(topic, msg, data),
    trace: (msg: string, data: Record<string, unknown> = {}) => logger.trace(topic, msg, data),
    verbose: (msg: string, data: Record<string, unknown> = {}) => logger.verbose(topic, msg, data)
  };
}

