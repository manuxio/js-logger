import chalk from 'chalk';
import { humanDate } from '../utils/format.js';
import { colorLevel, colorTopic, colorWord } from '../sinks/stdout.js';
import type { LevelName } from '../types.js';
import prettyjson from 'prettyjson';

function treeify(input: string, trunk: string = "║") {
  const lines = input.split(/\r?\n/);
  const n = lines.length;

  return lines.map((line, i) => {
    let junction;
    if (n === 1) {
      junction = "─";       // single line case
    } else if (i === 0) {
      junction = "┌";
    } else if (i === n - 1) {
      junction = "└";
    } else {
      junction = "├";
    }
    return `${trunk} ${junction} ${line}`;
  }).join("\n");
}

const _transformCaches = new WeakMap();

function transformUppercaseWords(input: string, transform: Function) {
  let cache = _transformCaches.get(transform);
  if (!cache) {
    cache = new Map();
    _transformCaches.set(transform, cache);
  }

  return input.replace(/(?<![A-Za-z0-9'_-])(?=(?:[A-Z0-9'_-]+\s+)*[A-Z0-9'_-]*[A-Z])[A-Z0-9'_-]+(?:\s+[A-Z0-9'_-]+)*(?![A-Za-z0-9'_-])/g, match => {
    if (cache.has(match)) return cache.get(match);
    const result = transform(match);
    cache.set(match, result);
    return result;
  });
}

interface LogEntry {
  ts: number;
  level: LevelName;
  topic: string;
  msg: string;
  script?: string;
  router?: string;
  appId?: string;
  [key: string]: unknown;
}

export function formatLogEntry(entry: LogEntry): string {
  const dateStr = humanDate();
  
  // Build topic with context
  const topicColored = 
    entry.router && entry.script ?
      colorTopic(`${entry.router}/${entry.script}/${entry.topic}`)
      : (entry.script ?
        colorTopic(`${entry.script}/${entry.topic}`) :
        (entry.appId ?
          colorTopic(`${entry.appId}/${entry.topic}`) :
          colorTopic(`${entry.topic}`)));

  const levelColored = colorLevel(entry.level.toUpperCase());
  const nMsg = transformUppercaseWords(entry.msg, colorWord);
  
  // Extract extra fields
  const { router, script, topic, ts, level, appId, msg, line, ...rest } = entry;
  
  if (Object.keys(rest).length > 0) {
    const rendered = treeify(prettyjson.render(rest), " ");
    return `${dateStr} ${topicColored} ${levelColored} ${nMsg}\n${rendered ? rendered + "\n" : ""}`;
  } else {
    return `${dateStr} ${topicColored} ${levelColored} ${nMsg}\n`;
  }
}

export function parseLogLine(line: string): LogEntry | null {
  try {
    const parsed = JSON.parse(line);
    if (parsed && typeof parsed === 'object' && parsed.level && parsed.topic && parsed.msg) {
      return parsed as LogEntry;
    }
    return null;
  } catch (e) {
    return null;
  }
}
