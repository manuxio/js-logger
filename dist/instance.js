import { EnvConfigProvider } from './config/envProvider.js';
import { Logger } from './logger.js';
/**
 * Build an isolated (non-singleton) logger instance.
 * - Mirrors createLogger(), but DOES NOT touch the package singleton.
 * - Reuses the same options shape as LoggerInitOptions.
 */
export async function createInstance(opts) {
    const provider = opts.configProvider || new EnvConfigProvider();
    const cfg = opts.initialConfig || await provider.load();
    // routerName and instanceId are optional; keep parity with Logger constructor
    const logger = new Logger(opts.serviceName, cfg, opts.routerName, opts.instanceId);
    return logger;
}
// ---------- Per-instance auto-reload (does not affect the singleton) ----------
function same(a, b) {
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    catch {
        return false;
    }
}
/**
 * Start auto-reloading configuration into a specific logger instance.
 * Returns a stop function to cancel the interval.
 */
export function startAutoReloadInstance(provider, intervalMs = 60_000, instance) {
    let timer = null;
    let lastCfg = null;
    async function tick() {
        try {
            const cfg = await provider.load();
            if (!same(cfg, lastCfg)) {
                instance.update(cfg);
                lastCfg = cfg;
            }
        }
        catch {
            // ignore errors, will retry next tick
        }
    }
    if (timer)
        clearInterval(timer);
    timer = setInterval(tick, intervalMs);
    // kick off immediately
    tick();
    return () => {
        if (timer)
            clearInterval(timer);
        timer = null;
    };
}
