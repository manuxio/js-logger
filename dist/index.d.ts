export interface TopicLogger {
    fatal(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
    error(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
    warn(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
    info(msg: string, data?: Record<string, unknown> | Partial<Record<string, unknown>> | {}): void;
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
import type { LoggerInitOptions } from './types.js';
import { setConfig } from './state.js';
export declare function createLogger(opts: LoggerInitOptions): Promise<import("./logger").Logger>;
export declare function getLogger(): import('./logger').Logger;
export declare function getLogger(topic: string): TopicLogger;
export { setConfig };
