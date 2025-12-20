import type { LogConfig, LevelName } from './types.js';
import { EventEmitter } from 'events';
type Topic = string;
export declare class Logger extends EventEmitter {
    private cfg;
    private graylog?;
    private fileSink?;
    private meta;
    private forceRules;
    private forceDontLogRules;
    constructor(serviceName: string, cfg: LogConfig, routerName?: string, instanceId?: string);
    update(next: Partial<LogConfig>): void;
    getConfig(): LogConfig;
    private normalize;
    private setupSinks;
    private minLevelFor;
    private allowedFor;
    /**
     * Compile force rules from cfg (if present).
     * Reads from (this.cfg as any).forceLog to avoid changing external types.
     */
    private applyForceRules;
    /**
     * Check if this event should be forcibly logged according to compiled rules.
     * Returns the matched rule index or -1 if not forced.
     */
    private forceMatch;
    private forceDontLogMatch;
    log(level: LevelName, topic: Topic, msg: string, data?: Record<string, unknown>): void;
    fatal(topic: Topic, msg: string, data?: Record<string, unknown>): void;
    error(topic: Topic, msg: string, data?: Record<string, unknown>): void;
    warn(topic: Topic, msg: string, data?: Record<string, unknown>): void;
    info(topic: Topic, msg: string, data?: Record<string, unknown>): void;
    debug(topic: Topic, msg: string, data?: Record<string, unknown>): void;
    trace(topic: Topic, msg: string, data?: Record<string, unknown>): void;
    verbose(topic: Topic, msg: string, data?: Record<string, unknown>): void;
}
export {};
