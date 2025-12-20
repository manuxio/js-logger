export type LevelName = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'verbose';
export interface SinkTopics {
    allow?: string[];
    deny?: string[];
}
export interface StdoutSink {
    enabled: boolean;
    minLevel: LevelName;
    pretty: boolean;
    topics?: SinkTopics;
}
export interface ConsoleSink {
    enabled: boolean;
    minLevel: LevelName;
    pretty: boolean;
    topics?: SinkTopics;
}
export interface RemoteLogHub {
    enabled: boolean;
    minLevel: LevelName;
    url: string;
    topics?: SinkTopics;
    drainInterval: number;
}
export type Topic = string;
export interface BufferedLog {
    level: LevelName;
    topic: Topic;
    msg: string;
    data: Record<string, unknown> | string;
    appId: string;
}
export interface FileSink {
    enabled: boolean;
    minLevel: LevelName;
    filePath: string;
    topicFilePath?: string;
    topics?: SinkTopics;
}
export interface GraylogSink {
    enabled: boolean;
    minLevel: LevelName;
    host: string;
    port: number;
    topics?: SinkTopics;
    extra?: Record<string, string | number | boolean>;
}
/**
 * Optional configuration to force logging of certain events by regex match.
 * - rules: array of match rules
 * - maxRules: optional safety cap (default 20 if not set)
 * - fields: optional array of dot-paths to check; if omitted or [], defaults to ["msg"]
 */
export interface ForceLogRule {
    pattern: string;
    flags?: string;
    fields?: string[];
}
export interface ForceLogConfig {
    rules: ForceLogRule[];
    maxRules?: number;
}
export interface ForceDontLogRule {
    pattern: string;
    flags?: string;
    fields?: string[];
}
export interface ForceDontLogConfig {
    rules: ForceDontLogRule[];
    maxRules?: number;
}
export interface LogConfig {
    globalLevel: LevelName;
    topicLevels: Record<string, LevelName>;
    sinks: {
        stdout: StdoutSink;
        file: FileSink;
        graylog: GraylogSink;
    };
    forceLog?: ForceLogConfig;
    forceDontLog?: ForceDontLogConfig;
}
export interface LoggerInitOptions {
    serviceName: string;
    routerName?: string;
    instanceId?: string;
    initialConfig?: LogConfig;
    configProvider?: ConfigProvider;
}
export interface LoggerInitOptionsInBrowser {
    serviceName: string;
    initialConfig?: LogConfigInBrowser;
}
export interface LogConfigInBrowser {
    globalLevel: LevelName;
    topicLevels: Record<string, LevelName>;
    sinks: {
        console: ConsoleSink;
        remote?: RemoteLogHub;
    };
    forceLog?: ForceLogConfig;
    forceDontLog?: ForceDontLogConfig;
}
export interface ConfigProvider {
    load(): Promise<LogConfig>;
}
