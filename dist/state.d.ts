import type { LogConfig } from './types.js';
import { Logger } from './logger.js';
export declare function create(service: string, cfg: LogConfig, router?: string, instance?: string): Logger;
export declare function get(): Logger;
export declare function setConfig(cfg: LogConfig): void;
