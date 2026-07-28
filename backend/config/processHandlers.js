/**
 * Process-level reliability handlers: unhandled rejections, uncaught exceptions, graceful shutdown.
 * Order: stop accepting connections → drain HTTP → then close DB / OTEL (onShutdown).
 */
import { logger } from '../utils/logger.js';
import { captureException } from './monitoring.js';

let shuttingDown = false;

export function registerProcessHandlers({ server, onShutdown } = {}) {
    process.on('unhandledRejection', (reason) => {
        const err = reason instanceof Error ? reason : new Error(String(reason));
        logger.error('Unhandled promise rejection', {
            type: 'unhandledRejection',
            error: err.message,
            stack: err.stack,
        });
        captureException(err, { type: 'unhandledRejection' });
    });

    process.on('uncaughtException', (err) => {
        logger.error('Uncaught exception', {
            type: 'uncaughtException',
            error: err.message,
            stack: err.stack,
        });
        captureException(err, { type: 'uncaughtException' });
        // Fatal — exit after flush attempt
        setTimeout(() => process.exit(1), 1000).unref();
    });

    const shutdown = async (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        logger.info('Graceful shutdown started', { signal });
        const forceTimer = setTimeout(() => {
            logger.error('Graceful shutdown timed out; forcing exit');
            process.exit(1);
        }, Number(process.env.SHUTDOWN_TIMEOUT_MS || 15_000));
        forceTimer.unref();

        try {
            // 1) Stop accepting new connections and drain in-flight requests first
            if (server) {
                await new Promise((resolve, reject) => {
                    server.close((err) => (err ? reject(err) : resolve()));
                });
                logger.info('HTTP server closed');
            }
            // 2) Then release DB pool / telemetry
            if (typeof onShutdown === 'function') await onShutdown();
            process.exit(0);
        } catch (err) {
            logger.error('Shutdown error', { error: err.message });
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
