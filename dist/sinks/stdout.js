import chalk from 'chalk';
import { humanDate, kvString } from '../utils/format.js';
import prettyjson from 'prettyjson';
function treeify(input, trunk = "║") {
    const lines = input.split(/\r?\n/);
    const n = lines.length;
    return lines.map((line, i) => {
        let junction;
        if (n === 1) {
            junction = "─"; // single line case
        }
        else if (i === 0) {
            junction = "┌";
        }
        else if (i === n - 1) {
            junction = "└";
        }
        else {
            junction = "├";
        }
        return `${trunk} ${junction} ${line}`;
    }).join("\n");
}
export function colorLevel(lvl) {
    switch (lvl) {
        case 'FATAL': return chalk.bgRed.white(lvl);
        case 'ERROR': return chalk.red(lvl);
        case 'WARN': return chalk.yellow(lvl);
        case 'INFO': return chalk.green(lvl);
        case 'DEBUG': return chalk.blue(lvl);
        case 'TRACE': return chalk.magenta(lvl);
        case 'VERBOSE': return chalk.gray(lvl);
        default: return lvl;
    }
}
export function colorTopic(topic) {
    const colors = [chalk.cyan, chalk.green, chalk.yellow, chalk.magenta, chalk.blue, chalk.white, chalk.gray];
    let hash = 0;
    for (let i = 0; i < topic.length; i++)
        hash = (hash * 31 + topic.charCodeAt(i)) >>> 0;
    const color = colors[hash % colors.length];
    return color(`[${topic}]`);
}
const _transformCaches = new WeakMap();
function transformUppercaseWords(input, transform) {
    let cache = _transformCaches.get(transform);
    if (!cache) {
        cache = new Map();
        _transformCaches.set(transform, cache);
    }
    return input.replace(/(?<![A-Za-z0-9'_-])(?=(?:[A-Z0-9'_-]+\s+)*[A-Z0-9'_-]*[A-Z])[A-Z0-9'_-]+(?:\s+[A-Z0-9'_-]+)*(?![A-Za-z0-9'_-])/g, match => {
        if (cache.has(match))
            return cache.get(match);
        const result = transform(match);
        cache.set(match, result);
        return result;
    });
}
export function colorWord(word) {
    const colors = [chalk.cyan, chalk.green, chalk.yellow, chalk.magenta, chalk.blue, chalk.white, chalk.gray];
    let hash = 0;
    for (let i = 0; i < word.length; i++)
        hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    const color = colors[hash % colors.length];
    return color(`${chalk.white.bold.underline(word)}`);
}
export function stdoutWrite(devPretty, topic, level, msg, data) {
    if (devPretty) {
        const dateStr = humanDate();
        const topicColored = data && data.router && data.script ?
            colorTopic(`${data.router}/${data.script}/${topic}`)
            : (data && data.script ?
                colorTopic(`${data.script}/${topic}`) :
                (data && data.appId ?
                    colorTopic(`${data.appId}/${topic}`) :
                    colorTopic(`${topic}`)));
        // const topicColored = data && data.script ? colorTopic(`${data.script}/${topic}`) : colorTopic(`${topic}`);
        const levelColored = colorLevel(level.toUpperCase());
        const extras = kvString(data);
        const words = msg.split(' ');
        const nMsg = transformUppercaseWords(msg, colorWord);
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
            const { router, script, topic, ts, level, appId, ...rest } = data;
            const rendered = Object.keys(rest).length ? treeify(prettyjson.render(rest), " ") : "";
            const outBlock = `${dateStr} ${topicColored} ${levelColored} ${nMsg}\n${rendered ? rendered + "\n" : ""}`;
            process.stdout.write(outBlock);
            // process.stdout.write(
            //   `${dateStr} ${topicColored} ${levelColored} ${nMsg}\n${rendered}\n`
            // );
            return outBlock;
        }
        else {
            const extraStr = extras ? ` ${extras}` : "";
            const outBlock = `${dateStr} ${topicColored} ${levelColored} ${nMsg}${extraStr}\n`;
            process.stdout.write(outBlock);
            return outBlock;
        }
    }
    else {
        const base = { ts: Math.floor(Date.now() / 1000), level, topic, msg, ...data };
        const outBlock = JSON.stringify(base) + '\n';
        process.stdout.write(outBlock);
        return outBlock;
    }
}
