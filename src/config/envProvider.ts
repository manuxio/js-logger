import { normalizeLevel, coerceTopicLevels } from '../logging/levels.js';
import type { ConfigProvider, LogConfig, LevelName } from '../types.js';

const parseList = (s?: string) => (s || '').split(',').map(x => x.trim()).filter(Boolean);

export class EnvConfigProvider implements ConfigProvider {
  async load(): Promise<LogConfig> {
    const globalLevel = normalizeLevel(process.env.LOG_LEVEL || 'info');
    const pretty = (process.env.LOG_STDOUT_PRETTY || 'true') === 'true';

    // topicLevels: either JSON string or csv topic=level
    let topicLevels: Record<string, LevelName> = {};
    const tl = process.env.LOG_TOPIC_LEVELS;
    if (tl) {
      try {
        topicLevels = coerceTopicLevels(JSON.parse(tl));
      } catch {
        const obj: Record<string, string> = {};
        for (const pair of parseList(tl)) {
          const [k, v] = pair.split('=');
          if (k && v) obj[k] = v;
        }
        topicLevels = coerceTopicLevels(obj);
      }
    }

    return {
      globalLevel,
      topicLevels,
      sinks: {
        stdout: {
          enabled: (process.env.LOG_STDOUT_ENABLED || 'true') === 'true',
          minLevel: normalizeLevel(process.env.LOG_STDOUT_MIN_LEVEL || globalLevel),
          pretty
        },
        file: {
          enabled: (process.env.LOG_FILE_ENABLED || 'false') === 'true',
          minLevel: normalizeLevel(process.env.LOG_FILE_MIN_LEVEL || globalLevel),
          filePath: process.env.LOG_FILE_PATH || './logs/app-%DATE%.log',
          topicFilePath: process.env.LOG_TOPIC_FILE_PATH || undefined
        },
        graylog: {
          enabled: (process.env.LOG_GELF_ENABLED || 'false') === 'true',
          minLevel: normalizeLevel(process.env.LOG_GELF_MIN_LEVEL || globalLevel),
          host: process.env.GRAYLOG_HOST || '127.0.0.1',
          port: Number(process.env.GRAYLOG_PORT || '12201')
        }
      }
    };
  }
}
