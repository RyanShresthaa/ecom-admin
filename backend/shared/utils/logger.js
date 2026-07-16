/**
 * Small structured logger (JSON or pretty); level from LOG_LEVEL / NODE_ENV.
 */
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const levels = { error: 0, warn: 1, info: 2, debug: 3 };

function shouldLog(l) {
    return levels[l] <= (levels[level] ?? 2);
}

function write(level, message, meta = {}) {
    if (!shouldLog(level)) return;
    const entry = {
        ts: new Date().toISOString(),
        level,
        message,
        ...meta,
    };
    const line = process.env.LOG_FORMAT === 'pretty'
        ? `[${entry.level.toUpperCase()}] ${entry.message}`
        : JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
}

// Handle logger utility logic for logger.
export const logger = {
    error: (message, meta) => write('error', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    info: (message, meta) => write('info', message, meta),
    debug: (message, meta) => write('debug', message, meta),
};
