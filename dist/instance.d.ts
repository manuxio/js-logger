import type { ConfigProvider, LoggerInitOptions } from './types.js';
import { Logger } from './logger.js';
/**
 * Build an isolated (non-singleton) logger instance.
 * - Mirrors createLogger(), but DOES NOT touch the package singleton.
 * - Reuses the same options shape as LoggerInitOptions.
 */
export declare function createInstance(opts: LoggerInitOptions): Promise<Logger>;
/**
 * Start auto-reloading configuration into a specific logger instance.
 * Returns a stop function to cancel the interval.
 */
export declare function startAutoReloadInstance(provider: ConfigProvider, intervalMs: number | undefined, instance: Logger): () => void;
