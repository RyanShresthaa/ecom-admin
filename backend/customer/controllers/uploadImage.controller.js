/**
 * Cloudinary upload helper used by upload route / avatar flows.
 */
import uploadImageCloudinary from "../../shared/utils/uploadImageCloudinary.js";
import { queueImageProcessing } from "../../shared/queue/enqueue.js";

// POST /api/upload/image — uploads image file and returns hosted URL.
const uploadImageController = async (req, res) => {
    try {
        // Validate multipart payload before forwarding to Cloudinary.
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                message: "No image file provided",
                error: true,
                success: false
            });
        }
        const uploadResult = await uploadImageCloudinary(file);
        const url = uploadResult?.secure_url || uploadResult;
        queueImageProcessing({
            url,
            publicId: uploadResult?.public_id,
            transforms: 'auto',
        }).catch(() => {});
        return res.json({
            message: "Image uploaded successfully",
            data: url,
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Upload failed",
            error: true,
            success: false
        });
    }
};

export default uploadImageController;