/**
 * Global 404 and centralized error handler (CORS, Multer, Sentry via monitoring).
 * Register after all routes in server.js.
 */
import { captureException } from '../config/monitoring.js';

const isProduction = () => process.env.NODE_ENV === 'production';

export const notFound = (req, res) => {
    // Return route-aware 404 payload (with requestId when available).
    res.status(404).json({
        message: isProduction() ? 'Not found' : `Not found: ${req.method} ${req.originalUrl}`,
        error: true,
        success: false,
        ...(req.requestId ? { requestId: req.requestId } : {}),
    });
};

export const errorHandler = (err, req, res, _next) => {
    // Normalize CORS denials into a consistent forbidden response.
    if (err?.message?.includes('CORS')) {
        return res.status(403).json({ message: 'Origin not allowed', error: true, success: false });
    }
    // Convert upload parser failures to client validation errors.
    if (err?.message?.includes('images are allowed') || err?.name === 'MulterError') {
        return res.status(400).json({
            message: err.message || 'Invalid upload',
            error: true,
            success: false,
        });
    }
    // Capture unexpected exceptions for centralized monitoring.
    captureException(err, {
        path: req.originalUrl,
        method: req.method,
        userId: req.userId,
        requestId: req.requestId,
    });
    const status = err.statusCode || err.status || 500;
    const message =
        isProduction() && status >= 500
            ? 'Server error'
            : err.message || 'Server error';
    res.status(status).json({
        message,
        error: true,
        success: false,
        ...(req.requestId ? { requestId: req.requestId } : {}),
    });
};
