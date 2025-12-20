export * from './types.js';
import { BrowserLogger } from './logger.browser.js';
let singleton = null;
export function create(service, cfg, router, instance) {
    if (singleton)
        return singleton;
    singleton = new BrowserLogger(service, cfg);
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
export { normalizeLevel, coerceTopicLevels } from './logging/levels';
/** Initialize the singleton logger (browser-safe).
 *  Supply a full LogConfig object; no environment or Mongo providers here.
 */
export function createLogger(opts) {
    const defaultConfig = {
        globalLevel: 'info',
        topicLevels: {},
        sinks: {
            console: { enabled: true, minLevel: "info", pretty: true }
        }
    };
    const cfg = opts.initialConfig || defaultConfig;
    return create(opts.serviceName, cfg);
}
/** Get the singleton logger or a topic-bound facade. */
export function getLogger(topic) {
    const logger = get();
    if (!topic)
        return logger;
    return {
        fatal: (msg, data = {}) => logger.fatal(topic, msg, data),
        error: (msg, data = {}) => logger.error(topic, msg, data),
        warn: (msg, data = {}) => logger.warn(topic, msg, data),
        info: (msg, data = {}) => logger.info(topic, msg, data),
        debug: (msg, data = {}) => logger.debug(topic, msg, data),
        trace: (msg, data = {}) => logger.trace(topic, msg, data),
        verbose: (msg, data = {}) => logger.verbose(topic, msg, data)
    };
}
