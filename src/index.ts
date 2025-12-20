export interface TopicLogger {
  fatal(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  error(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  warn (msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  info (msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  debug(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  trace(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
  verbose(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
}

import { levelFromName } from './utils/levels.js';
export { levelFromName };

export type { LevelName, LogConfig, LoggerInitOptions, ConfigProvider } from './types.js';
export { normalizeLevel, coerceTopicLevels, LEVELS } from './logging/levels.js';
export { EnvConfigProvider } from './config/envProvider.js';
export { MongoConfigProvider } from './config/mongoProvider.js';
export { startAutoReload, stopAutoReload } from './reload.js';
export { createInstance, startAutoReloadInstance } from './instance.js';
export { httpLogger } from './express.js';

import type { LoggerInitOptions, LogConfig } from './types.js';
import { EnvConfigProvider } from './config/envProvider.js';
import { create, get, setConfig } from './state.js';

export async function createLogger(opts: LoggerInitOptions) {
  const provider = opts.configProvider || new EnvConfigProvider();
  const cfg = opts.initialConfig || await provider.load();
  return create(opts.serviceName, cfg, opts.routerName, opts.instanceId);
}

// OVERLOADS
export function getLogger(): import('./logger').Logger;
export function getLogger(topic: string): TopicLogger;
// implementation
export function getLogger(topic?: string) {
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

export { setConfig };
