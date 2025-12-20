import type { ConfigProvider, LogConfig } from '../types.js';
export declare class EnvConfigProvider implements ConfigProvider {
    load(): Promise<LogConfig>;
}
