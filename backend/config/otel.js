/**
 * Optional OpenTelemetry (OTLP HTTP). Enabled when OTEL_ENABLED=true or OTEL_EXPORTER_OTLP_ENDPOINT is set.
 * Uses @opentelemetry/sdk-node + auto-instrumentations when installed.
 */
import { logger } from '../utils/logger.js';

let sdk = null;

export async function initOpenTelemetry() {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
    const enabled =
        process.env.OTEL_ENABLED === 'true' || Boolean(endpoint);

    if (!enabled) {
        logger.info('OpenTelemetry disabled (set OTEL_ENABLED=true or OTEL_EXPORTER_OTLP_ENDPOINT)');
        return;
    }

    try {
        const { NodeSDK } = await import('@opentelemetry/sdk-node');
        const { getNodeAutoInstrumentations } = await import(
            '@opentelemetry/auto-instrumentations-node'
        );
        const { OTLPTraceExporter } = await import(
            '@opentelemetry/exporter-trace-otlp-http'
        );

        const exporter = new OTLPTraceExporter({
            url: endpoint
                ? endpoint.replace(/\/$/, '') + (endpoint.includes('/v1/traces') ? '' : '/v1/traces')
                : undefined,
        });

        sdk = new NodeSDK({
            serviceName: process.env.OTEL_SERVICE_NAME || process.env.SERVICE_NAME || 'ecommerce-api',
            traceExporter: exporter,
            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-fs': { enabled: false },
                }),
            ],
        });

        await sdk.start();
        logger.info('OpenTelemetry tracing enabled', {
            endpoint: endpoint || 'default',
            serviceName: process.env.OTEL_SERVICE_NAME || 'ecommerce-api',
        });
    } catch (err) {
        logger.warn('OpenTelemetry init failed', { error: err.message });
    }
}

export async function shutdownOpenTelemetry() {
    if (!sdk) return;
    try {
        await sdk.shutdown();
        logger.info('OpenTelemetry shut down');
    } catch (err) {
        logger.warn('OpenTelemetry shutdown error', { error: err.message });
    }
}
