# @manuxio/s97-js-logger

A lightweight, high-performance logging library for Node.js projects with support for:

- **Multiple sinks** in parallel:
  - Stdout (pretty in development, flat JSON in production)
  - File (JSON lines, optional per-topic files, rotation)
  - Graylog GELF over UDP
- **Configurable levels**:
  - Global min level
  - Per-topic min levels
  - Per-sink topic allow/deny filters
- **Dynamic config reload** from MongoDB or other providers
- **Express HTTP request logging** middleware
- **Force controls**:
  - `forceLog`: always log matching records (bypass filters)
  - `forceDontLog`: never log matching records (deny first)

---

## Installation

This is a private package hosted on GitHub Packages. To install, you first need to configure npm to use the GitHub registry:

```bash
npm config set @manuxio:registry https://npm.pkg.github.com
```

Then install the package:

```bash
npm install @manuxio/s97-js-logger
```

**Note**: You need to be authenticated with GitHub to install private packages. Create a `.npmrc` file in your project root with:

```
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
@manuxio:registry=https://npm.pkg.github.com
```

Set `GITHUB_TOKEN` environment variable with a personal access token that has `read:packages` scope.

---

## Usage

```ts
import { Logger } from '@manuxio/s97-js-logger';
import type { LogConfig } from '@manuxio/s97-js-logger/types';

const config: LogConfig = {
  globalLevel: 'info',
  topicLevels: { http: 'debug' },
  sinks: {
    stdout: { enabled: true, minLevel: 'info', pretty: true },
    file:   { enabled: false, minLevel: 'debug', filePath: '/tmp/app.log' },
    graylog:{ enabled: false, minLevel: 'info', host: '127.0.0.1', port: 12201 }
  }
};

const logger = new Logger('my-service', config /* routerName? */, /* instanceId? */);

logger.info('startup', 'Service started');
logger.error('db', 'Database connection failed', { retry: true });
```

Update config at runtime:

```ts
logger.update({
  globalLevel: 'warn',
  topicLevels: { http: 'info' }
});
```

---

## Levels

Available levels (from highest severity to lowest):

```plaintext
fatal > error > warn > info > debug > trace > verbose
```

Each sink has its own `minLevel`, and you can override levels per topic in `topicLevels`.

---

## Topics

Topics let you route and filter logs. Example:

```typescript
logger.info('auth', 'User login success', { userId: 'u123' });
logger.debug('payments', 'Payment gateway response', { status: 'OK' });
```

You can allow or deny topics per sink:

```json
{
  "sinks": {
    "stdout": {
      "enabled": true,
      "minLevel": "info",
      "pretty": true,
      "topics": { "allow": ["auth", "http"] }
    }
  }
}
```

---

## HTTP Middleware

```typescript
import express from 'express';
import { httpLogger } from '@manuxio/s97-js-logger';

const app = express();
app.use(httpLogger('http'));
```

Logs each request with method, path, status, duration, and IP.

---

## 🔍 Force Logging by Regex (`forceLog`)

The logger can **force log** events if they match certain patterns, regardless of normal filtering.

### Configuration

Add an optional `forceLog` block to your `LogConfig`:

```jsonc
{
  "globalLevel": "warn",
  "topicLevels": { "http": "info" },
  "sinks": { /* ... */ },
  "forceLog": {
    "maxRules": 20, // optional, defaults to 20
    "rules": [
      {
        "pattern": "payment failed|chargeback|refund",
        "flags": "i",
        "fields": ["msg", "topic", "orderId"] // dot-paths allowed
      },
      {
        "pattern": "^CRITICAL:",
        "fields": ["msg"] // explicit, but optional
      },
      {
        "pattern": "agent=\\w+-\\d+" // fields omitted/[] => defaults to ["msg"]
      }
    ]
  }
}
```

**Fields**:

- `pattern`: String passed to `new RegExp(pattern, flags)`
- `flags`: Optional JS regex flags (e.g., `"i"`)
- `fields`: Array of keys (dot-paths allowed) to search; **defaults to `["msg"]`** if omitted or empty.

**Behavior**:

- Matching entries are sent to all **enabled** sinks regardless of:

  - Global/topic min level
  - Per-sink min level
  - Per-sink topic allow/deny lists
- Each matching log will include in its structured payload:

  - `forced: true`
  - `forcedRule: <index>`

---

## 🛑 Force-Deny Logging by Regex (`forceDontLog`)

The logger can also **suppress** events that match certain patterns, even if they would normally be logged.

### Configuration

Add an optional `forceDontLog` block to your `LogConfig`:

```jsonc
{
  "forceDontLog": {
    "maxRules": 20, // optional, defaults to 20
    "rules": [
      { "pattern": "heartbeat", "flags": "i", "fields": ["msg"] },
      { "pattern": "manuele", "flags": "i", "fields": ["agent"] }
    ]
  }
}
```

**Fields** behave exactly like `forceLog`: if `fields` is omitted or empty, the default is `["msg"]`.

**Behavior**:

- If a record matches any `forceDontLog` rule, it is **dropped entirely** (no sinks receive it).
- This check runs **before** `forceLog` and before any normal level/topic filtering.

---

## Precedence & Interaction

When a message is logged, the decision order is:

1. **`forceDontLog`** rules → if any match, **drop** (no output).
2. **`forceLog`** rules → if any match, **log** (bypass all filters; sinks must be enabled).
3. **Normal filtering** → apply global/topic min levels and per-sink topic/level filters.

This “deny-first, then allow” ordering avoids ambiguity if a message matches both sets.

---

## Full Config Example

```jsonc
{
  "globalLevel": "info",
  "topicLevels": {
    "http": "info",
    "auth": "debug"
  },
  "sinks": {
    "stdout": { "enabled": true, "minLevel": "info", "pretty": true },
    "file": {
      "enabled": true,
      "minLevel": "debug",
      "filePath": "/var/log/predictive.log",
      "topicFilePath": "/var/log/predictive-%TOPIC%.log"
    },
    "graylog": { "enabled": true, "minLevel": "info", "host": "graylog.example.com", "port": 12201 }
  },
  "forceDontLog": {
    "rules": [
      { "pattern": "heartbeat", "flags": "i", "fields": ["msg"] }
    ]
  },
  "forceLog": {
    "rules": [
      { "pattern": "^CRITICAL:", "fields": ["msg"] },
      { "pattern": "payment\\s+failed", "flags": "i", "fields": ["msg", "topic", "orderId"] }
    ]
  }
}
```

---

## File Sink Notes

- When using `topicFilePath`, `%TOPIC%` is replaced with the topic name (sanitized to `[A-Za-z0-9._-]`).

---

## Graylog Notes

- GELF messages include `_topic`, `_script` (service name), `_router` (router name), and any extra flat fields from the log call.
- Forced logs add `_forced` and `_forcedRule` for visibility (stdout/file use `forced`/`forcedRule` fields).
- For `forceDontLog` matches, **no message** is emitted to GELF (by design).

---

## Testing

A simple package test can verify:

- Normal level/topic filtering
- `forceLog` allows messages that would otherwise be filtered
- `forceDontLog` suppresses matching messages and takes precedence
- File sink receives JSON lines as expected

(See `scripts/test-logger.ts` or a CommonJS variant using the compiled `dist/` output.)

---

## License

MIT
