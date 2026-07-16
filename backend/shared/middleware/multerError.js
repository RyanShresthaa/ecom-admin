/**
 * Maps multer.MulterError and generic upload failures to HTTP 400 JSON responses.
 */
import multer from 'multer';

export function handleMulterError(err, req, res, next) {
    // Continue request lifecycle when upload middleware reports no error.
    if (!err) return next();
    // Map Multer-specific error codes to user-friendly 400 responses.
    if (err instanceof multer.MulterError) {
        const message =
            err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large (max 5MB)'
                : err.message;
        return res.status(400).json({ message, error: true, success: false });
    }
    // Fallback for non-Multer upload failures.
    return res.status(400).json({
        message: err.message || 'Upload failed',
        error: true,
        success: false,
    });
}
