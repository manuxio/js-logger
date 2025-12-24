import { EnvConfigProvider } from './config/envProvider.js';
import type { ConfigProvider, LoggerInitOptions } from './types.js';
import { Logger } from './logger.js';

/**
 * Build an isolated (non-singleton) logger instance.
 * - Mirrors createLogger(), but DOES NOT touch the package singleton.
 * - Reuses the same options shape as LoggerInitOptions.
 */
export async function createInstance(opts: LoggerInitOptions): Promise<Logger> {
  const provider: ConfigProvider = opts.configProvider || new EnvConfigProvider();
  const cfg = opts.initialConfig || await provider.load();
  // routerName and instanceId are optional; keep parity with Logger constructor
  const logger = new Logger(opts.appName, cfg, opts.routerName, opts.instanceId);
  return logger;
}

// ---------- Per-instance auto-reload (does not affect the singleton) ----------

function same(a: unknown, b: unknown): boolean {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

/**
 * Start auto-reloading configuration into a specific logger instance.
 * Returns a stop function to cancel the interval.
 */
export function startAutoReloadInstance(
  provider: ConfigProvider,
  intervalMs = 60_000,
  instance: Logger
): () => void {
  let timer: any = null;
  let lastCfg: unknown = null;

  async function tick() {
    try {
      const cfg = await provider.load();
      if (!same(cfg, lastCfg)) {
        instance.update(cfg as any);
        lastCfg = cfg;
      }
    } catch {
      // ignore errors, will retry next tick
    }
  }

  if (timer) clearInterval(timer);
  timer = setInterval(tick, intervalMs);
  // kick off immediately
  tick();

  return () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
}
