#!/usr/bin/env node
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { parseLogLine, formatLogEntry } from './log-formatter.js';
import { watch } from 'fs';
import { stat } from 'fs/promises';
import { levelFromName } from '../utils/levels.js';
let globalMinLevel;
function shouldDisplayLog(logLevel) {
    if (!globalMinLevel)
        return true;
    const minLevelValue = levelFromName(globalMinLevel);
    const logLevelValue = levelFromName(logLevel);
    return logLevelValue <= minLevelValue;
}
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        files: [],
        follow: false
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '-f' || arg === '--file') {
            options.follow = true;
            i++;
            if (i < args.length) {
                options.files.push(args[i]);
            }
            else {
                console.error(`Error: ${arg} requires a filename argument`);
                process.exit(1);
            }
        }
        else if (arg === '-l' || arg === '--level') {
            i++;
            if (i < args.length) {
                const level = args[i].toLowerCase();
                if (['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'verbose'].includes(level)) {
                    options.minLevel = level;
                }
                else {
                    console.error(`Error: Invalid level '${args[i]}'. Valid levels: fatal, error, warn, info, debug, trace, verbose`);
                    process.exit(1);
                }
            }
            else {
                console.error(`Error: ${arg} requires a level argument`);
                process.exit(1);
            }
        }
        else if (arg === '-h' || arg === '--help') {
            showHelp();
            process.exit(0);
        }
        else {
            // Treat as a file if it doesn't start with -
            if (!arg.startsWith('-')) {
                options.files.push(arg);
            }
            else {
                console.error(`Unknown option: ${arg}`);
                showHelp();
                process.exit(1);
            }
        }
    }
    return options;
}
function showHelp() {
    console.log(`
predictive-log - Tail and display log files with colored output

Usage:
  predictive-log [options] -f <file> [-f <file> ...]  # Follow mode (tail -f style)
  predictive-log [options] <file> [<file> ...]        # Read entire file and exit

Options:
  -f, --file <path>     Log file to tail in follow mode (shows last 10 lines, then watches for new content)
  -l, --level <level>   Minimum log level to display (fatal|error|warn|info|debug|trace|verbose)
  -h, --help            Show this help message

Examples:
  predictive-log app.log                         # Display entire log file
  predictive-log -f app.log                      # Tail log file (shows last 10 lines + new content)
  predictive-log -l error app.log                # Show only error and fatal logs
  predictive-log -l info -f app.log              # Tail file, showing info and above
  predictive-log -f app.log -f error.log         # Tail multiple files
  predictive-log -l warn -f app.log -f err.log   # Tail multiple files, warn and above
  cat app.log | predictive-log /dev/stdin        # Read from stdin
`);
}
async function tailFile(filePath, showLastLines = 10) {
    let position = 0;
    try {
        const stats = await stat(filePath);
        const fileSize = stats.size;
        // Show last N lines before starting to tail
        if (showLastLines > 0) {
            await readLastLines(filePath, showLastLines);
        }
        // Start watching from current end
        position = fileSize;
    }
    catch (e) {
        console.error(`Error reading file ${filePath}:`, e);
        return;
    }
    // Watch for changes
    const watcher = watch(filePath, async (eventType) => {
        if (eventType === 'change') {
            const stats = await stat(filePath);
            const newSize = stats.size;
            if (newSize > position) {
                await readFromPosition(filePath, position);
                position = newSize;
            }
            else if (newSize < position) {
                // File was truncated or rotated
                position = 0;
                await readFromPosition(filePath, 0);
                position = newSize;
            }
        }
    });
    // Handle process termination
    process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        watcher.close();
        process.exit(0);
    });
}
async function readLastLines(filePath, numLines) {
    return new Promise((resolve, reject) => {
        const stream = createReadStream(filePath, {
            encoding: 'utf8'
        });
        const rl = createInterface({
            input: stream,
            crlfDelay: Infinity
        });
        const lines = [];
        rl.on('line', (line) => {
            if (line.trim()) {
                lines.push(line);
                if (lines.length > numLines) {
                    lines.shift();
                }
            }
        });
        rl.on('close', () => {
            // Display the last N lines
            for (const line of lines) {
                const entry = parseLogLine(line);
                if (entry) {
                    if (shouldDisplayLog(entry.level)) {
                        process.stdout.write(formatLogEntry(entry));
                    }
                }
                else {
                    console.log(line);
                }
            }
            resolve();
        });
        rl.on('error', (err) => {
            reject(err);
        });
    });
}
async function readFromPosition(filePath, start) {
    return new Promise((resolve, reject) => {
        const stream = createReadStream(filePath, {
            start,
            encoding: 'utf8'
        });
        const rl = createInterface({
            input: stream,
            crlfDelay: Infinity
        });
        rl.on('line', (line) => {
            if (line.trim()) {
                const entry = parseLogLine(line);
                if (entry) {
                    if (shouldDisplayLog(entry.level)) {
                        process.stdout.write(formatLogEntry(entry));
                    }
                }
                else {
                    // If not a valid JSON log entry, just print it as-is
                    console.log(line);
                }
            }
        });
        rl.on('close', () => {
            resolve();
        });
        rl.on('error', (err) => {
            reject(err);
        });
    });
}
async function readFile(filePath) {
    // Handle stdin
    if (filePath === '/dev/stdin' || filePath === '-') {
        return readFromStream(process.stdin);
    }
    return readFromPosition(filePath, 0);
}
async function readFromStream(stream) {
    return new Promise((resolve, reject) => {
        const rl = createInterface({
            input: stream,
            crlfDelay: Infinity
        });
        rl.on('line', (line) => {
            if (line.trim()) {
                const entry = parseLogLine(line);
                if (entry) {
                    if (shouldDisplayLog(entry.level)) {
                        process.stdout.write(formatLogEntry(entry));
                    }
                }
                else {
                    // If not a valid JSON log entry, just print it as-is
                    console.log(line);
                }
            }
        });
        rl.on('close', () => {
            resolve();
        });
        rl.on('error', (err) => {
            reject(err);
        });
    });
}
async function main() {
    const options = parseArgs();
    if (options.files.length === 0) {
        console.error('Error: No log files specified');
        showHelp();
        process.exit(1);
    }
    // Set global min level for filtering
    globalMinLevel = options.minLevel;
    if (options.follow) {
        console.log(`Tailing ${options.files.length} file(s)...`);
        console.log('Press Ctrl+C to exit\n');
        // Start tailing all files, showing last 10 lines first
        const promises = options.files.map(file => tailFile(file, 10));
        await Promise.all(promises);
    }
    else {
        // Just read files once and exit
        for (const file of options.files) {
            await readFile(file);
        }
    }
}
// Handle EPIPE errors gracefully (e.g., when piping to head)
process.stdout.on('error', (err) => {
    if (err.code === 'EPIPE') {
        process.exit(0);
    }
});
main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
