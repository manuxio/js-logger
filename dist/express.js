import { getLogger } from './index.js';
export function httpLogger() {
    const log = getLogger('http');
    return (req, res, next) => {
        const start = process.hrtime.bigint();
        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
            log.info('request', {
                method: req.method,
                path: req.originalUrl,
                status: res.statusCode,
                duration_ms: Number(durationMs.toFixed(2)),
                ip: req.ip
            });
        });
        next();
    };
}
