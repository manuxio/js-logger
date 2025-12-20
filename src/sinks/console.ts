// Browser console sink: line-by-line adaptation of stdout.ts
import chalk from 'chalk';
import { humanDate, kvString } from '../utils/format.js';
import type { LevelName } from '../types.js';
import YAML from 'json-to-pretty-yaml';


// Mapping helper to choose console method by level (browser-safe)
function consoleMethodFor(level: LevelName) {
  switch (level) {
    case 'fatal':
    case 'error':
      return console.error.bind(console);
    case 'warn':
      return console.warn.bind(console);
    case 'info':
      return console.info.bind(console);
    case 'debug':
      return console.debug.bind(console);
    case 'trace':
    case 'verbose':
    default:
      return console.log.bind(console);
  }
}

function treeify(input: string, trunk : string = "║") {
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

export function colorLevel(lvl: string): string {
  switch (lvl) {
    case 'FATAL': return chalk.bgRed.white(lvl);
    case 'ERROR': return chalk.red(lvl);
    case 'WARN':  return chalk.yellow(lvl);
    case 'INFO':  return chalk.green(lvl);
    case 'DEBUG': return chalk.blue(lvl);
    case 'TRACE': return chalk.magenta(lvl);
    case 'VERBOSE': return chalk.gray(lvl);
    default: return lvl;
  }
}

export function colorTopic(topic: string): string {
  const colors = [chalk.cyan, chalk.green, chalk.yellow, chalk.magenta, chalk.blue, chalk.white, chalk.gray];
  let hash = 0;
  for (let i = 0; i < topic.length; i++) hash = (hash * 31 + topic.charCodeAt(i)) >>> 0;
  const color = colors[hash % colors.length];
  return color(`[${topic}]`);
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

export function colorWord(word: string): string {
  const colors = [chalk.cyan, chalk.green, chalk.yellow, chalk.magenta, chalk.blue, chalk.white, chalk.gray];
  let hash = 0;
  for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
  const color = colors[hash % colors.length];
  return color(`${chalk.white.bold.underline(word)}`);
}

export function consoleWrite(devPretty: boolean, topic: string, level: LevelName, msg: string, data: Record<string, unknown> | string) {
  let copyOfData : Record<string, unknown> = {};
  if (typeof data === "string") {
    copyOfData = { message: data };
  }
  if (typeof data === "object") {
    copyOfData = data;
  }
  if (devPretty) {
    const dateStr = humanDate();
    // console.log('copyOfData', copyOfData);
    const topicColored =
    copyOfData && copyOfData.router && copyOfData.script ?
      colorTopic(`${copyOfData.router}/${copyOfData.script}/${topic}`)
      : (copyOfData && copyOfData.script ?
        colorTopic(`${copyOfData.script}/${topic}`) :
        (copyOfData && copyOfData.appId ?
          colorTopic(`${copyOfData.appId}/${topic}`) :
          colorTopic(`${topic}`)));
    const levelColored = colorLevel(level.toUpperCase());
    const extras = kvString(copyOfData);
    
    const words = msg.split(' ');
    const nMsg = transformUppercaseWords(msg, colorWord);
    if (copyOfData && typeof copyOfData === "object" && Object.keys(copyOfData).length > 0) {
      const { script, topic, router, ts, level: _, ...rest } = copyOfData;
      const lines = Object.keys(rest) ? YAML.stringify(JSON.parse(JSON.stringify(rest))).split('\n').filter(l => l.trim()).join('\n') : "";

      const rendered = treeify(lines, " ");
      consoleMethodFor(level)(
        `${dateStr} ${topicColored} ${levelColored} ${nMsg}\n${rendered ? rendered + "\n" : ""}`
      );
    } else {
      const extraStr = extras ? ` ${extras}` : "";
      consoleMethodFor(level)(`${dateStr} ${topicColored} ${levelColored} ${nMsg}${extraStr}\n`);
    }
  } else {
    const base = { ts: Math.floor(Date.now()/1000), level, topic, msg, ...copyOfData };
    consoleMethodFor(level)(JSON.stringify(base) + '\n');
  }
}
