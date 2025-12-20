import { MongoClient } from 'mongodb';
import type { ConfigProvider, LogConfig } from '../types.js';
export interface MongoProviderOptions {
    client?: MongoClient;
    uri?: string;
    dbName: string;
    collection: string;
    query: Record<string, unknown>;
}
export declare class MongoConfigProvider implements ConfigProvider {
    private opts;
    constructor(opts: MongoProviderOptions);
    load(): Promise<LogConfig>;
}
