/**
 * Upload a Buffer (multer memory) to Cloudinary folder "clone"; requires CLOUDINARY_* env.
 * Config is applied at call time so dotenv has already loaded (ESM imports run before dotenv.config).
 */
import { v2 as cloudinary } from 'cloudinary';

function configureCloudinary() {
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const api_key = process.env.CLOUDINARY_API_KEY?.trim();
    const api_secret = (
        process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET_KEY
    )?.trim();

    if (!cloud_name || !api_key || !api_secret) {
        throw new Error(
            'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env (no spaces around =), then restart the server.',
        );
    }

    cloudinary.config({ cloud_name, api_key, api_secret });
}

const uploadImageCloudinary = async (image) => {
    configureCloudinary();

    const buffer = image?.buffer || Buffer.from(await image.arrayBuffer());

    const uploadImage = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: 'matina-crafts' }, (error, uploadResult) => {
            if (error) return reject(error);
            resolve(uploadResult);
        }).end(buffer);
    });

    return uploadImage;
};

export default uploadImageCloudinary;
