import { setConfig } from './state.js';
function same(a, b) {
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    catch {
        return false;
    }
}
let timer = null;
let lastCfg = null;
export function startAutoReload(provider, intervalMs = 60_000) {
    async function tick() {
        try {
            const cfg = await provider.load();
            if (!same(cfg, lastCfg)) {
                setConfig(cfg);
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
}
export function stopAutoReload() {
    if (timer)
        setInterval(timer);
    timer = null;
}
