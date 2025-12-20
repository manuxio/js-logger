import type { LevelName } from '../types.js';
interface LogEntry {
    ts: number;
    level: LevelName;
    topic: string;
    msg: string;
    script?: string;
    router?: string;
    appId?: string;
    [key: string]: unknown;
}
export declare function formatLogEntry(entry: LogEntry): string;
export declare function parseLogLine(line: string): LogEntry | null;
export {};
