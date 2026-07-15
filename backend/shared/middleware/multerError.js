/**
 * Maps multer.MulterError and generic upload failures to HTTP 400 JSON responses.
 */
import multer from 'multer';

export function handleMulterError(err, req, res, next) {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
        const message =
            err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large (max 5MB)'
                : err.message;
        return res.status(400).json({ message, error: true, success: false });
    }
    return res.status(400).json({
        message: err.message || 'Upload failed',
        error: true,
        success: false,
    });
}
