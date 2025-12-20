import dgram from 'node:dgram';
import os from 'node:os';
import zlib from 'node:zlib';

export interface GraylogOptions {
  host: string;   // Graylog UDP input host
  port: number;   // Graylog UDP input port (default 12201)
  hostName?: string; // override for GELF "host"
  chunkSize?: number; // bytes for each UDP chunk payload (default 1420)
  enabled?: boolean;
}

export type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'verbose';

function levelToSyslog(lvl: Level | string): number {
  switch (String(lvl)) {
    case 'fatal': return 2; // critical
    case 'error': return 3;
    case 'warn':  return 4;
    case 'notice':return 5;
    case 'info':  return 6;
    case 'debug':
    case 'trace':
    case 'verbose': return 7;
    default: return 6;
  }
}

function underscoreExtras(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    // Only simple JSON types; drop functions/undefined
    if (v === undefined || typeof v === 'function') continue;
    const key = k.startsWith('_') ? k : `_${k}`;
    out[key] = v;
  }
  return out;
}

/**
 * Graylog GELF 1.1 UDP client with zlib compression and chunking.
 * Compatible with Graylog's "GELF UDP" input.
 */
export class GraylogClient {
  private socket: dgram.Socket | null = null;
  private options: Required<GraylogOptions>;

  constructor(opts: GraylogOptions) {
    this.options = {
      enabled: true,
      chunkSize: 1420, // safe for 1500 MTU networks
      hostName: undefined,
      ...opts,
    } as Required<GraylogOptions>;
    if (this.options.enabled) {
      this.socket = dgram.createSocket('udp4');
    }
  }

  close() {
    if (this.socket) {
      try { this.socket.close(); } catch {}
      this.socket = null;
    }
  }

  /**
   * Send a single log entry.
   * `msg` is the human message; `topic` scopes the logger; `meta` are flat kvs.
   * `serviceName` and `routerName` help populate GELF extras.
   */
  send(
    level: Level,
    msg: string,
    topic: string,
    meta: Record<string, unknown>,
    serviceName?: string,
    routerName?: string
  ) {
    if (!this.socket || !this.options.enabled) return;
    // console.log('META', meta);
    // Required fields
    const nowSec = Date.now() / 1000;
    const hostField = this.options.hostName || os.hostname();

    const shortMessage =
      typeof msg === 'string' && msg.length > 0
        ? msg
        : topic
        ? `${topic} ${String(level)}`
        : String(level);

    // Extras: prefix all with "_"
    const extras = underscoreExtras({
      topic,
      script: serviceName,
      router: routerName,
      ...meta,
    });

    const gelf: Record<string, unknown> = {
      version: '1.1',
      host: hostField,
      short_message: shortMessage,
      timestamp: Math.floor(Date.now()/1000),
      level: levelToSyslog(level),
      facility: serviceName || topic || 'app',
      ...extras,
    };

    const json = Buffer.from(JSON.stringify(gelf));
    const compressed = zlib.deflateSync(json);

    // If compressed fits one datagram, send directly; else chunk per GELF spec.
    const maxChunkPayload = Math.max(256, this.options.chunkSize - 12); // 12 bytes header
    if (compressed.length <= this.options.chunkSize) {
      this.socket.send(compressed, this.options.port, this.options.host);
      const h0 = compressed[0]?.toString(16).padStart(2, '0');
      const h1 = compressed[1]?.toString(16).padStart(2, '0');
      /*
      process.stderr.write(
        `graylog:udp single bytes=${compressed.length} zlib_head=${h0} ${h1}\n`
      );
      process.stderr.write(Buffer.from(JSON.stringify(gelf).toString()));
      */
      return;
    }

    // Chunked GELF
    const id = cryptoRandom8();
    const total = Math.ceil(compressed.length / maxChunkPayload);
    if (total > 128) {
      // Graylog only supports up to 128 chunks
      // Fallback: send truncated message (last resort to avoid total loss)
      const truncated = compressed.subarray(0, maxChunkPayload * 128);
      this.sendChunks(truncated, id, 128, maxChunkPayload);
      return;
    }
    this.sendChunks(compressed, id, total, maxChunkPayload);
  }

  private sendChunks(buf: Buffer, id: Buffer, total: number, chunkPayload: number) {
    let offset = 0;
    for (let seq = 0; seq < total; seq++) {
      const size = Math.min(chunkPayload, buf.length - offset);
      const header = Buffer.allocUnsafe(12);
      header[0] = 0x1e;
      header[1] = 0x0f;
      id.copy(header, 2);         // 8 bytes
      header[10] = seq;           // sequence number
      header[11] = total;         // total chunks
      const frame = Buffer.concat([header, buf.subarray(offset, offset + size)]);
      this.socket!.send(frame, this.options.port, this.options.host);
      offset += size;
    }
  }
}

function cryptoRandom8(): Buffer {
  // 8-byte random message id for GELF chunking
  // Use crypto if available; fallback to Math.random
  try {
    const { randomFillSync } = require('node:crypto') as typeof import('node:crypto');
    const b = Buffer.allocUnsafe(8);
    randomFillSync(b);
    return b;
  } catch {
    const b = Buffer.allocUnsafe(8);
    for (let i = 0; i < 8; i++) b[i] = (Math.random() * 256) | 0;
    return b;
  }
}
