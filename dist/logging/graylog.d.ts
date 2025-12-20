export interface GraylogOptions {
    host: string;
    port: number;
    hostName?: string;
    chunkSize?: number;
    enabled?: boolean;
}
export type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'verbose';
/**
 * Graylog GELF 1.1 UDP client with zlib compression and chunking.
 * Compatible with Graylog's "GELF UDP" input.
 */
export declare class GraylogClient {
    private socket;
    private options;
    constructor(opts: GraylogOptions);
    close(): void;
    /**
     * Send a single log entry.
     * `msg` is the human message; `topic` scopes the logger; `meta` are flat kvs.
     * `serviceName` and `routerName` help populate GELF extras.
     */
    send(level: Level, msg: string, topic: string, meta: Record<string, unknown>, serviceName?: string, routerName?: string): void;
    private sendChunks;
}
