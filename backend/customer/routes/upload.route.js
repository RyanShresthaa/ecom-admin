/**
 * /api/upload — Cloudinary image upload (staff).
 * @see routes inline handler + uploadImage.controller.js · OpenAPI: docs/openapi/admin.paths.js
 */
import { Router } from "express";
import auth from "../../shared/middleware/auth.js";
import { staff } from "../../shared/middleware/roles.js";
import uploadImageController from "../controllers/uploadImage.controller.js";
import upload from "../../shared/middleware/multer.js";
import { handleMulterError } from "../../shared/middleware/multerError.js";
import { uploadLimiter } from "../../shared/middleware/rateLimiter.js";

const uploadRouter = Router();

// POST /upload - upload image with rate limiting, auth/staff guard, multer parsing, and multer error handling.
uploadRouter.post("/upload", uploadLimiter, auth, staff, (req, res, next) => {
    upload.single("image")(req, res, (err) => {
        if (err) return handleMulterError(err, req, res, next);
        next();
    });
}, uploadImageController);

export default uploadRouter