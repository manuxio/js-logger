import type { LevelName } from '../types.js';

export const LEVELS: Record<LevelName, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
  verbose: 5
};

export function normalizeLevel(name?: string): LevelName {
  const n = (name ?? 'info').toLowerCase() as LevelName;
  return (LEVELS as any)[n] ? n : 'info';
}

/** Coerce a persisted topicLevels (object or Map) to Record<string, LevelName> */
export function coerceTopicLevels(input: unknown): Record<string, LevelName> {
  const out: Record<string, LevelName> = {};
  if (!input) return out;
  const entries = input instanceof Map ? Array.from(input.entries()) : Object.entries(input as Record<string, unknown>);
  for (const [k, v] of entries) {
    out[k] = normalizeLevel(typeof v === 'string' ? v : String(v));
  }
  return out;
}
