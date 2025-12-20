export * from './types.js';
import type { LoggerInitOptionsInBrowser, LogConfigInBrowser } from './types.js';
import { BrowserLogger } from './logger.browser.js';
export declare function create(service: string, cfg: LogConfigInBrowser, router?: string, instance?: string): BrowserLogger;
export declare function get(): BrowserLogger;
export declare function setConfig(cfg: LogConfigInBrowser): void;
export interface TopicLogger {
    fatal(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
    error(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
    warn(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
    info(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
    debug(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
    trace(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
    verbose(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
}
export type { LevelName, LogConfigInBrowser as LogConfig, LoggerInitOptionsInBrowser as LoggerInitOptions } from './types';
export { normalizeLevel, coerceTopicLevels } from './logging/levels';
/** Initialize the singleton logger (browser-safe).
 *  Supply a full LogConfig object; no environment or Mongo providers here.
 */
export declare function createLogger(opts: LoggerInitOptionsInBrowser): BrowserLogger;
/** Get the singleton logger or a topic-bound facade. */
export declare function getLogger(topic?: string): any;
