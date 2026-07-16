/**
 * In-memory multipart upload: one image (JPEG/PNG/WebP/GIF), max 5MB.
 * Used by product and upload routes; Multer errors flow through handleMulterError.
 */
import multer from 'multer';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter(_req, file, cb) {
        // Accept only image MIME types used by product/upload APIs.
        if (ALLOWED_MIME.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
        }
    },
});

export default upload;
