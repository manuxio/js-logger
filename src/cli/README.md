# predictive-log CLI

A command-line tool for tailing and displaying log files produced by the @predictive/logger library with colored output.

## Features

- **Colored output**: Uses the same color scheme as the console/stdout sinks
- **Multiple files**: Tail multiple log files simultaneously
- **Follow mode**: Watch files for new content (like `tail -f`)
- **JSON parsing**: Automatically parses and formats JSON log entries
- **Extra fields**: Displays all additional fields in a tree structure

## Usage

### Read log files once and exit
```bash
predictive-log <file> [<file> ...]
```

### Follow mode (tail -f style)
```bash
predictive-log -f <file> [-f <file> ...]
```

### Examples

```bash
# Display a single log file
predictive-log app.log

# Display multiple log files
predictive-log app.log error.log

# Tail a log file (follow mode)
predictive-log -f app.log

# Tail multiple log files
predictive-log -f app.log -f error.log

# Use with pipes
cat app.log | predictive-log /dev/stdin

# Use with head/tail
predictive-log app.log | head -20
```

## Development

Run from source during development:
```bash
npm run log -- <arguments>
# or
npx tsx src/cli/index.ts <arguments>
```

## Installation

After building the package, the `predictive-log` command will be available when the package is installed.

```bash
npm run build
npm link  # For local development
```
