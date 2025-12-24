import { levelFromName } from './utils/levels.js';
export { levelFromName };
export { normalizeLevel, coerceTopicLevels, LEVELS } from './logging/levels.js';
export { EnvConfigProvider } from './config/envProvider.js';
export { MongoConfigProvider } from './config/mongoProvider.js';
export { startAutoReload, stopAutoReload } from './reload.js';
export { createInstance, startAutoReloadInstance } from './instance.js';
export { httpLogger } from './express.js';
import { EnvConfigProvider } from './config/envProvider.js';
import { create, get, setConfig } from './state.js';
export async function createLogger(opts) {
    const provider = opts.configProvider || new EnvConfigProvider();
    const cfg = opts.initialConfig || await provider.load();
    return create(opts.appName, cfg, opts.routerName, opts.instanceId);
}
// implementation
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
export { setConfig };
