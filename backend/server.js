/**
 * API entry point (Express 5).
 * @module server
 * @see docs/README.md — developer guide
 * @see docs/DEPLOYMENT.md — production (item 5)
 * @see docs/MONITORING.md — probes, metrics, OpenTelemetry
 * OpenAPI: GET /api/health (see docs/openapi/health.paths.js)
 *
 * Middleware order: requestId, morgan, metrics, slowRequest, helmet, cors, body,
 * sanitize, securityLogger, rateLimit, csrf, routes, errors
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import pool from './config/connectDB.js';
import { validateEnv } from './config/validateEnv.js';
import { getCorsOptions, getHelmetOptions } from './config/security.js';
import { setupSwagger, isSwaggerEnabled } from './config/swagger.js';
import { initMonitoring, setupExpressErrorHandler } from './config/monitoring.js';
import { initOpenTelemetry, shutdownOpenTelemetry } from './config/otel.js';
import { registerProcessHandlers } from './config/processHandlers.js';
import { healthHandler, livenessHandler, readinessHandler } from './config/health.js';
import { metricsHandler } from './config/metrics.js';
import { runProductionChecks } from './config/production.js';
import { apiLimiter, speedLimiter, initRateLimiters } from './middleware/rateLimiter.js';
import { initRateLimitStore } from './middleware/rateLimitStore.js';
import { closeRedis } from './config/redis.js';
import { sanitizeInput } from './middleware/sanitizeInput.js';
import { csrfProtection } from './middleware/csrf.js';
import { securityRequestLogger } from './middleware/securityLogger.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { slowRequestLogger } from './middleware/slowRequestLogger.js';
import userRouter from './routes/user.route.js';
import productRouter from './routes/product.route.js';
import categoryRouter from './routes/category.route.js';
import subCategoryRouter from './routes/subcategory.route.js';
import cartRouter from './routes/cart.route.js';
import orderRouter from './routes/order.route.js';
import addressRouter from './routes/address.route.js';
import adminRouter from './routes/admin.route.js';
import paymentRouter from './routes/payment.route.js';
import uploadRouter from './routes/upload.route.js';
import couponRouter from './routes/coupon.route.js';
import reviewRouter from './routes/review.route.js';
import wishlistRouter from './routes/wishlist.route.js';
import returnRouter from './routes/return.route.js';
import shopRouter from './routes/shop.route.js';
import feedbackRouter from './routes/feedback.route.js';
import inventoryRouter from './routes/inventory.route.js';
import googleReviewRouter from './routes/googleReview.route.js';
import newsletterRouter from './routes/newsletter.route.js';
import blogRouter from './routes/blog.route.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import morgan from 'morgan';
import { stripeWebhookController } from './controllers/payment.controller.js';

const preservedLoadTestBypass = process.env.LOAD_TEST_BYPASS;
const preservedMetricsInsecure = process.env.METRICS_ALLOW_INSECURE;
dotenv.config();
if (preservedLoadTestBypass === '1') process.env.LOAD_TEST_BYPASS = '1';
if (preservedMetricsInsecure === 'true') process.env.METRICS_ALLOW_INSECURE = 'true';
validateEnv();

const app = express();

app.disable('x-powered-by');

if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
}

app.use(requestIdMiddleware);
morgan.token('req-id', (req) => req.requestId || '-');
app.use(
    morgan(
        process.env.NODE_ENV === 'production'
            ? ':remote-addr - :method :url :status :res[content-length] - :response-time ms :req-id'
            : ':method :url :status :response-time ms :req-id',
    ),
);
app.use(metricsMiddleware);
app.use(slowRequestLogger);

app.use(helmet(getHelmetOptions()));
app.use(compression({ threshold: 1024 }));
app.use(cors(getCorsOptions()));
app.use(hpp());

// Stripe webhook needs the raw body for signature verification (before JSON parser)
app.post(
    '/api/payment/webhook',
    express.raw({ type: 'application/json' }),
    stripeWebhookController,
);

app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use(securityRequestLogger);
app.use(speedLimiter);

setupSwagger(app);

/** Probes & metrics before rate limits so k8s/uptime scrapers are not 429'd */
app.get('/api/health/live', livenessHandler);
app.get('/api/health/ready', readinessHandler);
app.get('/api/health', healthHandler);
app.get('/metrics', metricsHandler);

app.use('/api', apiLimiter);
app.use(csrfProtection);

app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/category', categoryRouter);
app.use('/api/subcategory', subCategoryRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
app.use('/api/address', addressRouter);
app.use('/api/admin', adminRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/coupon', couponRouter);
app.use('/api/review', reviewRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/return', returnRouter);
app.use('/api/shop', shopRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/google-reviews', googleReviewRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/blog', blogRouter);

app.use(notFound);

const PORT = process.env.PORT || 5000;

async function start() {
    runProductionChecks();
    await initRateLimitStore();
    initRateLimiters();
    await initOpenTelemetry();
    await initMonitoring();
    setupExpressErrorHandler(app);
    app.use(errorHandler);

    const server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        if (isSwaggerEnabled()) {
            logger.info(`Swagger docs: http://localhost:${PORT}/api/docs`);
        }
        logger.info(`Health: /api/health  Live: /api/health/live  Ready: /api/health/ready  Metrics: /metrics`);
    });

    registerProcessHandlers({
        server,
        onShutdown: async () => {
            await shutdownOpenTelemetry();
            try {
                await closeRedis();
            } catch {
                /* ignore */
            }
            try {
                await pool.end();
            } catch {
                /* ignore */
            }
        },
    });
}

start().catch((err) => {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
});
