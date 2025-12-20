import { Logger } from './logger.js';
let singleton = null;
export function create(service, cfg, router, instance) {
    if (singleton)
        throw new Error('Logger already created.');
    singleton = new Logger(service, cfg, router, instance);
    return singleton;
}
export function get() {
    if (!singleton)
        throw new Error('Logger not initialized. Call createLogger() first.');
    return singleton;
}
export function setConfig(cfg) {
    if (!singleton)
        throw new Error('Logger not initialized');
    singleton.update(cfg);
}
