/**
 * Cloudinary upload helper used by upload route / avatar flows.
 */
import uploadImageCloudinary from '../utils/uploadImageCloudinary.js';
import { biz } from '../config/businessMetrics.js';

const uploadImageController = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            biz.uploadFail();
            return res.status(400).json({
                message: 'No image file provided',
                error: true,
                success: false,
            });
        }
        const uploadResult = await uploadImageCloudinary(file);
        biz.uploadOk();
        return res.json({
            message: 'Image uploaded successfully',
            data: uploadResult?.secure_url || uploadResult,
            error: false,
            success: true,
        });
    } catch (error) {
        biz.uploadFail();
        return res.status(500).json({
            message: error.message || 'Upload failed',
            error: true,
            success: false,
        });
    }
};

export default uploadImageController;
