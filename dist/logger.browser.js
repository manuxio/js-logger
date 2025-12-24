import { LEVELS, normalizeLevel } from './logging/levels.js';
import { consoleWrite } from './sinks/console.js';
import { topicAllowed } from './utils/topicFilter.js';
function valToString(v) {
    if (v == null)
        return '';
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean' || t === 'bigint')
        return String(v);
    if (t === 'object') {
        try {
            // Favor custom toString for tiny scalar-like values
            const s = v.toString?.();
            if (typeof s === 'string' && s !== '[object Object]')
                return s;
        }
        catch { }
    }
    return '';
}
function getByPath(obj, path) {
    if (!obj || !path)
        return undefined;
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur == null)
            return undefined;
        cur = cur[p];
    }
    return cur;
}
/* -------------------------------------------------------------------------- */
export class BrowserLogger {
    cfg;
    meta;
    drainInterval;
    bufferedLogs = [];
    // compiled force rules cache (local to this instance)
    forceRules = [];
    forceDontLogRules = [];
    constructor(appName, cfg) {
        this.meta = { appName };
        this.cfg = this.normalize(cfg);
        this.applyForceRules();
        this.rearmDrain();
    }
    rearmDrain() {
        if (this.cfg.sinks.remote?.enabled) {
            this.drainInterval = setTimeout(async () => await this.drainToRemote(), Math.min(5000, this.cfg.sinks.remote.drainInterval));
        }
    }
    async drainToRemote() {
        this.drainInterval = undefined;
        if (!this.cfg.sinks.remote?.enabled) {
            this.bufferedLogs = [];
            return;
        }
        ;
        const len = this.bufferedLogs.length;
        if (len > 0) {
            const logsToSend = this.bufferedLogs.splice(0, len).map((l) => {
                const { data, ...rest } = l;
                if (typeof data === 'object' && data) {
                    return {
                        ...rest,
                        ...data
                    };
                }
                return l;
            });
            const retval = await fetch(this.cfg.sinks.remote.url, {
                signal: AbortSignal.timeout(5000),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: logsToSend
                })
            });
            this.rearmDrain();
            if (!retval || !retval.ok) {
                console.error('Unable to send to log-hub:', retval.status, retval.statusText);
            }
            return retval;
        }
        this.rearmDrain();
        return;
    }
    update(next) {
        const merged = {
            globalLevel: normalizeLevel(next.globalLevel ?? this.cfg.globalLevel),
            topicLevels: { ...this.cfg.topicLevels, ...(next.topicLevels || {}) },
            sinks: { ...this.cfg.sinks, ...(next.sinks || {}) },
            forceDontLog: next.forceDontLog || this.cfg.forceDontLog,
            forceLog: next.forceLog || this.cfg.forceLog
        };
        this.cfg = this.normalize(merged);
        this.applyForceRules();
    }
    getConfig() { return this.cfg; }
    normalize(cfg) {
        return {
            ...cfg,
            globalLevel: normalizeLevel(cfg.globalLevel),
            topicLevels: Object.fromEntries(Object.entries(cfg.topicLevels || {}).map(([k, v]) => [k, normalizeLevel(v)])),
            sinks: {
                ...cfg.sinks,
            },
            forceDontLog: cfg.forceDontLog || undefined,
            forceLog: cfg.forceLog || undefined
        };
    }
    minLevelFor(topic) {
        const t = this.cfg.topicLevels?.[topic];
        if (t)
            return t;
        return this.cfg.globalLevel;
    }
    allowedFor(topic, level) {
        const n = this.minLevelFor(topic);
        return LEVELS[level] >= LEVELS[n];
    }
    applyForceRules() {
        const fl = this.cfg.forceLog;
        const fd = this.cfg.forceDontLog;
        this.forceRules = [];
        this.forceDontLogRules = [];
        if (fl && Array.isArray(fl.rules) && fl.rules.length > 0) {
            const max = typeof fl.maxRules === 'number' && fl.maxRules > 0 ? fl.maxRules : 20;
            for (const rule of fl.rules.slice(0, max)) {
                try {
                    if (!rule?.pattern)
                        continue;
                    const re = new RegExp(rule.pattern, rule.flags || undefined);
                    const fields = Array.isArray(rule.fields) && rule.fields.length > 0 ? rule.fields : ['msg'];
                    this.forceRules.push({ re, fields });
                }
                catch { }
            }
        }
        if (fd && Array.isArray(fd.rules) && fd.rules.length > 0) {
            const max = typeof fd.maxRules === 'number' && fd.maxRules > 0 ? fd.maxRules : 20;
            for (const rule of fd.rules.slice(0, max)) {
                try {
                    if (!rule?.pattern)
                        continue;
                    const re = new RegExp(rule.pattern, rule.flags || undefined);
                    const fields = Array.isArray(rule.fields) && rule.fields.length > 0 ? rule.fields : ['msg'];
                    this.forceDontLogRules.push({ re, fields });
                }
                catch { }
            }
        }
    }
    forceMatch(event) {
        if (this.forceRules.length === 0)
            return -1;
        for (let i = 0; i < this.forceRules.length; i++) {
            const { re, fields } = this.forceRules[i];
            let haystack = '';
            for (const f of fields) {
                const v = getByPath(event, f);
                if (v !== undefined) {
                    const s = valToString(v);
                    if (s)
                        haystack += (haystack ? ' ' : '') + s;
                }
            }
            if (haystack && re.test(haystack))
                return i;
        }
        return -1;
    }
    forceDontLogMatch(event) {
        if (this.forceDontLogRules.length === 0)
            return -1;
        for (let i = 0; i < this.forceDontLogRules.length; i++) {
            const { re, fields } = this.forceDontLogRules[i];
            let haystack = '';
            for (const f of fields) {
                const v = getByPath(event, f);
                if (v !== undefined) {
                    const s = valToString(v);
                    if (s)
                        haystack += (haystack ? ' ' : '') + s;
                }
            }
            if (haystack && re.test(haystack))
                return i;
        }
        return -1;
    }
    log(level, topic, msg, data = {}) {
        let copyOfData = {};
        if (typeof data !== "object") {
            if (typeof data === "string") {
                copyOfData = { message: data };
            }
            else if (typeof data === "number") {
                copyOfData = { value: data };
            }
            else {
                copyOfData = { data };
            }
        }
        else {
            copyOfData = data;
        }
        const eventBase = {
            ...copyOfData,
            msg,
            topic,
            level,
            app: this.meta.appName
        };
        const matchedDenyRule = this.forceDontLogMatch(eventBase);
        if (matchedDenyRule >= 0) {
            return;
        }
        const matchedAllowRule = this.forceMatch(eventBase);
        const forced = matchedAllowRule >= 0;
        if (!forced && !this.allowedFor(topic, level))
            return;
        const forcedExtras = forced ? { forced: true, forcedRule: matchedAllowRule } : undefined;
        if (this.cfg.sinks.console.enabled) {
            if (forced || (LEVELS[level] >= LEVELS[this.cfg.sinks.console.minLevel] && topicAllowed(topic, this.cfg.sinks.console.topics))) {
                const devPretty = !!this.cfg.sinks.console.pretty;
                const outData = forcedExtras ? { ...copyOfData, ...forcedExtras } : copyOfData;
                // Use browser console
                // NOTE: consoleWrite imported from sinks/console.ts
                // @ts-ignore
                consoleWrite(devPretty, topic, level, msg, outData);
            }
        }
        if (this.cfg.sinks.remote?.enabled) {
            if (forced || (LEVELS[level] >= LEVELS[this.cfg.sinks.remote.minLevel] && topicAllowed(topic, this.cfg.sinks.remote.topics))) {
                const outData = forcedExtras ? { ...copyOfData, ...forcedExtras } : copyOfData;
                this.bufferedLogs.push({ level, topic, msg, data: outData, appId: this.meta.appName });
            }
        }
    }
    fatal(topic, msg, data) { this.log('fatal', topic, msg, data); }
    error(topic, msg, data) { this.log('error', topic, msg, data); }
    warn(topic, msg, data) { this.log('warn', topic, msg, data); }
    info(topic, msg, data) { this.log('info', topic, msg, data); }
    debug(topic, msg, data) { this.log('debug', topic, msg, data); }
    trace(topic, msg, data) { this.log('trace', topic, msg, data); }
    verbose(topic, msg, data) { this.log('verbose', topic, msg, data); }
}
