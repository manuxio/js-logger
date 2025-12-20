import type { LogConfig } from './types.js';
import { Logger } from './logger.js';

let singleton: Logger | null = null;

export function create(service: string, cfg: LogConfig, router?: string, instance?: string) {
  if (singleton) throw new Error('Logger already created.');
  singleton = new Logger(service, cfg, router, instance);
  return singleton;
}

export function get(): Logger {
  if (!singleton) throw new Error('Logger not initialized. Call createLogger() first.');
  return singleton;
}

export function setConfig(cfg: LogConfig) {
  if (!singleton) throw new Error('Logger not initialized');
  singleton.update(cfg);
}
