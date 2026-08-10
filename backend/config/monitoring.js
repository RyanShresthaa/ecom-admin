/**
 * Optional Sentry + PostHog: init from env; captureException for errorHandler.
 * Call initMonitoring() before setupExpressErrorHandler(app).
 */
import { logger } from '../utils/logger.js';

let Sentry = null;
let posthog = null;
let initialized = false;

export async function initMonitoring() {
    if (initialized) return;
    initialized = true;

    const dsn = process.env.SENTRY_DSN?.trim();
    if (!dsn) {
        logger.info('Sentry disabled (set SENTRY_DSN to enable)');
    } else {
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

    const posthogToken = process.env.POSTHOG_PROJECT_TOKEN?.trim();
    if (!posthogToken) {
        logger.info('PostHog disabled (set POSTHOG_PROJECT_TOKEN to enable)');
        return;
    }

    try {
        const { PostHog } = await import('posthog-node');
        posthog = new PostHog(posthogToken, {
            host: process.env.POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
            enableExceptionAutocapture: true,
        });
        logger.info('PostHog error tracking enabled');
    } catch {
        logger.warn('PostHog token set but posthog-node not installed. Run: npm install posthog-node');
    }
}

export function captureException(err, context = {}) {
    logger.error(err?.message || String(err), {
        type: 'exception',
        ...context,
    });
    if (Sentry) {
        Sentry.withScope((scope) => {
            Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
            Sentry.captureException(err);
        });
    }
    if (posthog) {
        const distinctId =
            context.userId != null && context.userId !== ''
                ? String(context.userId)
                : context.requestId
                  ? `anon:${context.requestId}`
                  : 'server';
        posthog.captureException(err, distinctId, {
            ...context,
            service: process.env.SERVICE_NAME || 'ecommerce-api',
        });
    }
}

export function setupExpressErrorHandler(app) {
    if (Sentry?.setupExpressErrorHandler) {
        Sentry.setupExpressErrorHandler(app);
        logger.info('Sentry Express error handler attached');
    }
    // Express route errors are reported via captureException() in errorHandler —
    // avoid attaching PostHog's Express middleware so the same exception is not sent twice.
}

export async function shutdownMonitoring() {
    if (posthog) {
        try {
            await posthog.shutdown();
        } catch {
            /* ignore */
        }
        posthog = null;
    }
}
