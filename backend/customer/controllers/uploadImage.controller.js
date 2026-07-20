/**
 * Cloudinary upload helper used by upload route / avatar flows.
 * Falls back to local /uploads when Cloudinary is not configured.
 */
import uploadImageCloudinary from "../../shared/utils/uploadImageCloudinary.js";
import { queueImageProcessing } from "../../shared/queue/enqueue.js";

function absolutizeUrl(req, url, isLocal = false) {
    if (!url || /^https?:\/\//i.test(url) || url.startsWith('data:')) return url
    // Keep local uploads relative so Vite/admin proxy can serve /uploads
    if (isLocal || url.startsWith('/uploads/')) {
        return url.startsWith('/') ? url : `/${url}`
    }
    const path = url.startsWith('/') ? url : `/${url}`
    const origin = `${req.protocol}://${req.get('host')}`
    return `${origin}${path}`
}

// POST /api/upload/upload — uploads image file and returns hosted URL.
const uploadImageController = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                message: "No image file provided",
                error: true,
                success: false
            });
        }
        const uploadResult = await uploadImageCloudinary(file);
        const rawUrl = uploadResult?.secure_url || uploadResult?.url || uploadResult;
        const url = absolutizeUrl(req, rawUrl, Boolean(uploadResult?.local));
        if (!uploadResult?.local) {
            queueImageProcessing({
                url,
                publicId: uploadResult?.public_id,
                transforms: 'auto',
            }).catch(() => {});
        }
        return res.json({
            message: "Image uploaded successfully",
            data: url,
            error: false,
            success: true
        });
    } catch (error) {
        const msg = String(error.message || "Upload failed");
        const hint = /api_key|Must supply/i.test(msg)
            ? " Cloudinary is not configured — add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to backend/.env"
            : "";
        return res.status(500).json({
            message: msg + hint,
            error: true,
            success: false
        });
    }
};

export default uploadImageController;
