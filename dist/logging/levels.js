export const LEVELS = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
    verbose: 5
};
export function normalizeLevel(name) {
    const n = (name ?? 'info').toLowerCase();
    return LEVELS[n] ? n : 'info';
}
/** Coerce a persisted topicLevels (object or Map) to Record<string, LevelName> */
export function coerceTopicLevels(input) {
    const out = {};
    if (!input)
        return out;
    const entries = input instanceof Map ? Array.from(input.entries()) : Object.entries(input);
    for (const [k, v] of entries) {
        out[k] = normalizeLevel(typeof v === 'string' ? v : String(v));
    }
    return out;
}
