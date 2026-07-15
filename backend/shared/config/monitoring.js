/**
 * Optional Sentry (@sentry/node): init from SENTRY_DSN; captureException for errorHandler.
 */
import { logger } from '../utils/logger.js';

let Sentry = null;

export async function initMonitoring() {
    const dsn = process.env.SENTRY_DSN?.trim();
    if (!dsn) {
        logger.info('Sentry disabled (set SENTRY_DSN to enable)');
        return;
    }
    try {
        const mod = await import('@sentry/node');
        Sentry = mod.default || mod;
        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || 'development',
            tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
        });
        logger.info('Sentry monitoring enabled');
    } catch {
        logger.warn('Sentry DSN set but @sentry/node not installed. Run: npm install @sentry/node');
    }
}

export function captureException(err, context = {}) {
    logger.error(err?.message || err, context);
    if (Sentry) {
        Sentry.withScope((scope) => {
            Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
            Sentry.captureException(err);
        });
    }
}

export function setupExpressErrorHandler(app) {
    if (Sentry?.setupExpressErrorHandler) {
        Sentry.setupExpressErrorHandler(app);
    }
}
