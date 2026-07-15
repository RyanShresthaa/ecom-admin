/**
 * /api/user — register, login, PIN, tokens, profile, seller apply, GDPR, deactivate.
 * @see controllers/user.controller.js · OpenAPI: docs/openapi/user.paths.js
 */
import { Router } from 'express';
import {
    forgotPasswordController,
    googleLoginController,
    loginController,
    loginPinController,
    logOutController,
    refreshToken,
    registerUserController,
    userDetails,
    resetpassword,
    updateUserDetails,
    uploadAvatar,
    verifyEmailController,
    verifyForgotPasswordOtp,
    applyForSellerController,
    exportAccountController,
    deleteAccountController,
    getCsrfController,
    setupPinController,
    changePinController,
    forgotPinController,
    verifyForgotPinOtpController,
    resetPinController,
    deactivateAccountController,
} from '../controllers/user.controller.js';
import auth from '../../shared/middleware/auth.js';
import upload from '../../shared/middleware/multer.js';
import { authLimiter, passwordResetLimiter, verifyEmailLimiter } from '../../shared/middleware/rateLimiter.js';
// import { verifyCaptcha } from '../../shared/middleware/captcha.js';
import { validateBody } from '../../shared/middleware/validate.js';
import {
    registerBodySchema,
    loginBodySchema,
    setupPinBodySchema,
    changePinBodySchema,
    forgotPinBodySchema,
    verifyForgotPinOtpBodySchema,
    resetPinBodySchema,
    loginPinBodySchema,
    deactivateAccountBodySchema,
} from '../../shared/validation/schemas.js';

const userRouter = Router();

userRouter.post('/register', authLimiter, validateBody(registerBodySchema), registerUserController);
userRouter.post('/verify-email', verifyEmailLimiter, verifyEmailController);
userRouter.post('/login', authLimiter, validateBody(loginBodySchema), loginController);
userRouter.post('/login-pin', authLimiter, validateBody(loginPinBodySchema), loginPinController);
userRouter.post('/google', authLimiter, googleLoginController);
userRouter.post('/logout', auth, logOutController);
userRouter.put('/upload-avatar', auth, upload.single('avatar'), uploadAvatar);
userRouter.put('/update-user', auth, updateUserDetails);
userRouter.post('/setup-pin', auth, validateBody(setupPinBodySchema), setupPinController);
userRouter.post('/change-pin', auth, validateBody(changePinBodySchema), changePinController);
userRouter.put('/forgot-pin', passwordResetLimiter, validateBody(forgotPinBodySchema), forgotPinController);
userRouter.post('/forgot-pin', passwordResetLimiter, validateBody(forgotPinBodySchema), forgotPinController);
userRouter.put('/verify-forgot-pin-otp', passwordResetLimiter, validateBody(verifyForgotPinOtpBodySchema), verifyForgotPinOtpController);
userRouter.post('/verify-forgot-pin-otp', passwordResetLimiter, validateBody(verifyForgotPinOtpBodySchema), verifyForgotPinOtpController);
userRouter.put('/reset-pin', passwordResetLimiter, validateBody(resetPinBodySchema), resetPinController);
userRouter.post('/reset-pin', passwordResetLimiter, validateBody(resetPinBodySchema), resetPinController);
userRouter.put('/forgot-password', passwordResetLimiter, forgotPasswordController);
userRouter.post('/forgot-password', passwordResetLimiter, forgotPasswordController);
userRouter.put('/verify-forgot-password-otp', passwordResetLimiter, verifyForgotPasswordOtp);
userRouter.post('/verify-forgot-password-otp', passwordResetLimiter, verifyForgotPasswordOtp);
userRouter.put('/reset-password', passwordResetLimiter, resetpassword);
userRouter.post('/reset-password', passwordResetLimiter, resetpassword);
userRouter.post('/refresh-token', authLimiter, refreshToken);
userRouter.get('/user-details', auth, userDetails);
userRouter.get('/csrf', auth, getCsrfController);
userRouter.post('/apply-seller', auth, applyForSellerController);
userRouter.get('/export-account', auth, exportAccountController);
userRouter.delete('/delete-account', auth, deleteAccountController);
userRouter.post('/deactivate-account', auth, validateBody(deactivateAccountBodySchema), deactivateAccountController);

export default userRouter;
