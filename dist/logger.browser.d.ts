import type { Topic, LogConfigInBrowser, LevelName } from './types.js';
export declare class BrowserLogger {
    private cfg;
    private meta;
    private drainInterval;
    private bufferedLogs;
    private forceRules;
    private forceDontLogRules;
    constructor(appName: string, cfg: LogConfigInBrowser);
    rearmDrain(): void;
    drainToRemote(): Promise<ReturnType<typeof fetch> | void>;
    update(next: Partial<LogConfigInBrowser>): void;
    getConfig(): LogConfigInBrowser;
    private normalize;
    private minLevelFor;
    private allowedFor;
    private applyForceRules;
    private forceMatch;
    private forceDontLogMatch;
    log(level: LevelName, topic: Topic, msg: string, data?: Record<string, unknown> | string): void;
    fatal(topic: Topic, msg: string, data?: Record<string, unknown> | string): void;
    error(topic: Topic, msg: string, data?: Record<string, unknown> | string): void;
    warn(topic: Topic, msg: string, data?: Record<string, unknown> | string): void;
    info(topic: Topic, msg: string, data?: Record<string, unknown> | string): void;
    debug(topic: Topic, msg: string, data?: Record<string, unknown> | string): void;
    trace(topic: Topic, msg: string, data?: Record<string, unknown> | string): void;
    verbose(topic: Topic, msg: string, data?: Record<string, unknown> | string): void;
}
