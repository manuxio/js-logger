import { MongoClient } from 'mongodb';
import { normalizeLevel, coerceTopicLevels } from '../logging/levels.js';
import type { ConfigProvider, LogConfig } from '../types.js';

export interface MongoProviderOptions {
  client?: MongoClient;
  uri?: string;
  dbName: string;
  collection: string;
  query: Record<string, unknown>;
}

export class MongoConfigProvider implements ConfigProvider {
  constructor(private opts: MongoProviderOptions) {}

  async load(): Promise<LogConfig> {
    const autoCloseClient = !this.opts.client;
    const client =
      this.opts.client ??
      (await MongoClient.connect(this.opts.uri!).catch((err) => {
        console.error(err);
        throw err;
      }));

    if (!client) throw new Error('Unable to connect to MongoDB');

    try {
      const doc = await client
        .db(this.opts.dbName)
        .collection(this.opts.collection)
        .findOne(this.opts.query);

      if (!doc) {
        const globalLevel = 'info' as const;
        return {
          globalLevel,
          topicLevels: {},
          sinks: {
            stdout: { enabled: true, minLevel: globalLevel, pretty: true },
            file: {
              enabled: false,
              minLevel: globalLevel,
              filePath: './logs/app-%DATE%.log',
            },
            graylog: {
              enabled: false,
              minLevel: globalLevel,
              host: '127.0.0.1',
              port: 12201,
            },
          },
        };
      }

      const globalLevel = normalizeLevel(doc.globalLevel || 'info');
      const forceDontLog = doc.forceDontLog || [];
      const forceLog = doc.forceLog || [];

      return {
        globalLevel,
        topicLevels: coerceTopicLevels(doc.topicLevels || {}),
        sinks: {
          stdout: {
            enabled: !!doc.sinks?.stdout?.enabled,
            minLevel: normalizeLevel(doc.sinks?.stdout?.minLevel || globalLevel),
            pretty: !!doc.sinks?.stdout?.pretty,
          },
          file: {
            enabled: !!doc.sinks?.file?.enabled,
            minLevel: normalizeLevel(doc.sinks?.file?.minLevel || globalLevel),
            filePath: String(
              doc.sinks?.file?.filePath || './logs/app-%DATE%.log'
            ),
            topicFilePath: doc.sinks?.file?.topicFilePath
              ? String(doc.sinks.file.topicFilePath)
              : undefined,
          },
          graylog: {
            enabled: !!doc.sinks?.graylog?.enabled,
            minLevel: normalizeLevel(
              doc.sinks?.graylog?.minLevel || globalLevel
            ),
            host: String(doc.sinks?.graylog?.host || '127.0.0.1'),
            port: Number(doc.sinks?.graylog?.port || 12201),
          },
        },
        forceDontLog,
        forceLog,
      };
    } finally {
      if (autoCloseClient && client) {
        await client.close();
      }
    }
  }
}
