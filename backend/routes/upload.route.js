/**
 * /api/upload — Cloudinary image upload (staff).
 * @see routes inline handler + uploadImage.controller.js · OpenAPI: docs/openapi/admin.paths.js
 */
import { Router } from "express";
import auth from "../middleware/auth.js";
import { staff } from "../middleware/roles.js";
import uploadImageController from "../controllers/uploadImage.controller.js";
import upload from "../middleware/multer.js";
import { handleMulterError } from "../middleware/multerError.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";

const uploadRouter = Router();

uploadRouter.post("/upload", auth, staff, uploadLimiter, (req, res, next) => {
    upload.single("image")(req, res, (err) => {
        if (err) return handleMulterError(err, req, res, next);
        next();
    });
}, uploadImageController);

export default uploadRouter