import type { LevelName } from '../types.js';
export declare function colorLevel(lvl: string): string;
export declare function colorTopic(topic: string): string;
export declare function colorWord(word: string): string;
export declare function stdoutWrite(devPretty: boolean, topic: string, level: LevelName, msg: string, data: Record<string, unknown>): string | undefined;
