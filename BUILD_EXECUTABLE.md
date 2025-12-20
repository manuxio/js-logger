# Creating a Standalone Executable

## Option 1: npm link (Recommended for Development)
```bash
npm run build
npm link
```
Now `predictive-log` is available globally on your system.

## Option 2: Standalone Binary with pkg
Create a single executable that doesn't require Node.js:

### Install pkg
```bash
npm install -g pkg
```

### Build the executable
```bash
# Build for current platform
pkg dist/cli/index.js -t node18-linux-x64 -o predictive-log

# Or build for multiple platforms
pkg dist/cli/index.js -t node18-linux-x64,node18-macos-x64,node18-win-x64
```

### Copy to system path
```bash
sudo cp predictive-log /usr/local/bin/
```

## Option 3: Using esbuild for bundling
Bundle everything into a single JS file:

```bash
npm install -D esbuild

# Bundle
npx esbuild dist/cli/index.js --bundle --platform=node --outfile=predictive-log.bundle.js

# Make executable
echo '#!/usr/bin/env node' | cat - predictive-log.bundle.js > predictive-log
chmod +x predictive-log
```

## Option 4: Install from package
If you publish the package or install it locally:

```bash
npm install -g /home/dialer/predictive/packages/logger
```

## Current Status
✅ Built with TypeScript → JavaScript in `dist/`
✅ Configured in package.json with `bin` entry
✅ Linked globally with `npm link`
✅ Available as `predictive-log` command

## Testing
```bash
# Test the command
predictive-log --help

# Test with actual log files
predictive-log /path/to/log/file.log
predictive-log -f /path/to/log/file.log
```
