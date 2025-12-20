import type { LevelName } from '../types.js';
export declare const LEVELS: Record<LevelName, number>;
export declare function normalizeLevel(name?: string): LevelName;
/** Coerce a persisted topicLevels (object or Map) to Record<string, LevelName> */
export declare function coerceTopicLevels(input: unknown): Record<string, LevelName>;
