/**
 * Auth & account HTTP handlers for `/api/user` (register, login, Google, **mobile PIN**,
 * refresh, profile, seller apply, GDPR, **deactivate**). Cookies + CSRF: see `issueAuthCookies`, `middleware/csrf.js`.
 */
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

import sendEmail from '../../shared/config/sendEmail.js';
import {
    getAccessCookieOptions,
    getRefreshCookieOptions,
    getRefreshSecret,
    JWT_VERIFY_OPTIONS,
} from '../../shared/config/security.js';
import verifyEmailTemplate from '../../shared/utils/verifyEmailTemplate.js';
import generateAccessToken from '../../shared/utils/generateAccessToken.js';
import generateRefreshToken from '../../shared/utils/generatedRefreshToken.js';
import uploadImageCloudinary from '../../shared/utils/uploadImageCloudinary.js';
import generateOtp from '../../shared/utils/generateOtp.js';
import forgotPasswordTemplate from '../../shared/utils/forgotPasswordTemplate.js';
import { validatePasswordStrength } from '../../shared/utils/password.js';
import { validatePinFormat } from '../../shared/utils/pin.js';
import { pickId } from '../../shared/utils/sql.js';
import { getClientIp, getUserAgent } from '../../shared/utils/requestMeta.js';
import { generateCsrfToken, setCsrfCookie } from '../../shared/middleware/csrf.js';
import {
    checkAccountLockout,
    recordLoginFailure,
    recordLoginSuccess,
} from '../../shared/middleware/abuseGuard.js';
import { logSecurityEvent } from '../../shared/models/securityEvent.model.js';
import {
    findUserByEmail,
    findUserByVerifyToken,
    findUserByGoogleId,
    findUserById,
    findUserAuthById,
    findUserPublicById,
    createUser,
    createGoogleUser,
    updateUser,
    deleteUserAccount,
    exportUserData,
} from '../../shared/models/user.model.js';

export const PASSWORD_RESET_VERIFIED = 'VERIFIED';
/** Same marker pattern in `pin_reset_otp` after email OTP is verified (before `reset-pin`). */
export const PIN_RESET_VERIFIED = PASSWORD_RESET_VERIFIED;

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
const googleOAuthClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const REGISTER_RESPONSE_MSG =
    'Registration successful. If this email is new, check your inbox to verify your account.';

function clearAuthCookies(response) {
    const accessOpts = getAccessCookieOptions();
    const refreshOpts = getRefreshCookieOptions();
    const cookieOpts = { httpOnly: true, secure: accessOpts.secure, sameSite: accessOpts.sameSite };
    response.clearCookie('accessToken', { ...cookieOpts, path: accessOpts.path });
    response.clearCookie('token', { ...cookieOpts, path: accessOpts.path });
    response.clearCookie('refreshToken', { ...cookieOpts, path: refreshOpts.path });
    response.clearCookie('csrfToken', {
        httpOnly: false,
        secure: accessOpts.secure,
        sameSite: accessOpts.sameSite,
        path: '/',
    });
}

async function issueAuthCookies(response, userId, req, { recordLoginSuccess: shouldRecordSuccess } = {}) {
    const accesstoken = await generateAccessToken(userId);
    const refreshToken = await generateRefreshToken(userId);
    response.cookie('accessToken', accesstoken, getAccessCookieOptions());
    response.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
    const csrfToken = generateCsrfToken();
    setCsrfCookie(response, csrfToken);
    await updateUser(userId, { last_login_date: new Date() });
    const recordSuccess = shouldRecordSuccess !== undefined ? shouldRecordSuccess : Boolean(req);
    if (recordSuccess && req) {
        await recordLoginSuccess(userId, req);
    }
    return { accesstoken, refreshToken, csrfToken };
}

export async function registerUserController(request, response) {
    try {
        const { name, email, password } = request.body;
        if (!name || !email || !password) {
            return response.status(400).json({
                message: 'provide email, name, password',
                error: true,
                success: false,
            });
        }
        const pwdErr = validatePasswordStrength(password);
        if (pwdErr) {
            return response.status(400).json({ message: pwdErr, error: true, success: false });
        }
        if (await findUserByEmail(email)) {
            return response.json({ message: REGISTER_RESPONSE_MSG, error: false, success: true });
        }
        const hashPassword = await bcrypt.hash(password, 10);
        const verify_email_token = crypto.randomBytes(32).toString('hex');
        const save = await createUser({ name, email, password: hashPassword });
        await updateUser(pickId(save), { verify_email_token });

        const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || '';
        const url = `${baseUrl}/verify-email?code=${verify_email_token}`;
        try {
            await sendEmail({
                sendTo: email,
                subject: 'Verify email',
                html: verifyEmailTemplate(name, url),
            });
        } catch (err) {
            await logSecurityEvent({
                userId: pickId(save),
                action: 'auth.register_email_failed',
                ip: getClientIp(request),
                userAgent: getUserAgent(request),
                success: false,
                details: { reason: String(err?.message || err) },
            }).catch(() => {});
        }

        await logSecurityEvent({
            userId: pickId(save),
            action: 'auth.register',
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
            success: true,
            details: {},
        }).catch(() => {});

        return response.json({
            message: REGISTER_RESPONSE_MSG,
            error: false,
            success: true,
            data: { name: save.name, email: save.email },
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function verifyEmailController(request, response) {
    try {
        const code = request.body?.code;
        if (!code) {
            return response.status(400).json({ message: 'Invalid code', error: true, success: false });
        }
        const user = await findUserByVerifyToken(String(code));
        if (!user) {
            return response.status(400).json({ message: 'Invalid code', error: true, success: false });
        }
        await updateUser(user.id, { verify_email: true, verify_email_token: null });
        return response.json({ message: 'Verify email done', success: true, error: false });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

const GENERIC_LOGIN_FAIL = 'Invalid email or password';
const ADMIN_ROLE = 'Admin';

function mustVerifyEmailBeforeLogin(user) {
    return user.role !== ADMIN_ROLE && !user.verify_email;
}

export async function loginController(request, response) {
    try {
        const { email, password } = request.body;
        if (!email || !password) {
            return response.status(400).json({ message: 'provide email, password', error: true, success: false });
        }
        const user = await findUserByEmail(email);
        const lockMsg = await checkAccountLockout(user);
        if (lockMsg) {
            return response.status(423).json({ message: lockMsg, error: true, success: false });
        }
        if (!user || user.status !== 'Active') {
            await recordLoginFailure(user?.id ?? null, request);
            return response.status(400).json({ message: GENERIC_LOGIN_FAIL, error: true, success: false });
        }
        if (!user.password || !(await bcrypt.compare(password, user.password))) {
            await recordLoginFailure(user.id, request);
            return response.status(400).json({ message: GENERIC_LOGIN_FAIL, error: true, success: false });
        }
        if (mustVerifyEmailBeforeLogin(user)) {
            return response.status(403).json({
                message: 'Please verify your email before signing in',
                error: true,
                success: false,
            });
        }

        const tokens = await issueAuthCookies(response, user.id, request);
        return response.json({
            message: 'Login successfully',
            error: false,
            success: true,
            data: tokens,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function googleLoginController(request, response) {
    try {
        const credential = request.body?.credential || request.body?.idToken;
        if (!credential || !googleOAuthClient || !googleClientId) {
            return response.status(400).json({ message: 'Google sign-in is not available', error: true, success: false });
        }
        const ticket = await googleOAuthClient.verifyIdToken({
            idToken: credential,
            audience: googleClientId,
        });
        const payload = ticket.getPayload();
        const googleId = payload?.sub;
        const email = payload?.email;
        const name = payload?.name || email || 'User';
        const picture = payload?.picture || '';
        if (!googleId || !email) {
            return response.status(400).json({ message: 'Invalid Google token', error: true, success: false });
        }

        let user = await findUserByGoogleId(googleId);
        if (!user) {
            const byEmail = await findUserByEmail(email);
            if (byEmail) {
                if (byEmail.google_id && byEmail.google_id !== googleId) {
                    return response.status(400).json({ message: GENERIC_LOGIN_FAIL, error: true, success: false });
                }
                await updateUser(byEmail.id, {
                    google_id: googleId,
                    verify_email: true,
                    ...(picture ? { avatar: picture } : {}),
                });
                user = await findUserById(byEmail.id);
            } else {
                user = await createGoogleUser({
                    name,
                    email,
                    google_id: googleId,
                    avatar: picture,
                });
            }
        }

        if (!user || user.status !== 'Active') {
            return response.status(403).json({ message: 'Account not active', error: true, success: false });
        }

        const tokens = await issueAuthCookies(response, user.id, request);
        return response.json({
            message: 'Login successfully',
            error: false,
            success: true,
            data: tokens,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function logOutController(request, response) {
    try {
        clearAuthCookies(response);
        if (request.userId) {
            await updateUser(request.userId, { refresh_token: '' });
        }
        await logSecurityEvent({
            userId: request.userId ?? null,
            action: 'logout',
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
            success: true,
            details: {},
        }).catch(() => {});
        return response.json({ message: 'Logout successfully', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function uploadAvatar(request, response) {
    try {
        const upload = await uploadImageCloudinary(request.file);
        const url = upload?.secure_url || upload?.url || '';
        await updateUser(request.userId, { avatar: url });
        return response.json({
            message: 'upload profile',
            success: true,
            error: false,
            data: { _id: request.userId, avatar: url },
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function updateUserDetails(request, response) {
    try {
        const { name, email, mobile, password, currentPassword } = request.body;
        const full = await findUserById(request.userId);
        if (!full) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }

        const fields = {};
        if (name) fields.name = name;
        if (email) fields.email = email;
        if (mobile !== undefined && mobile !== null) fields.mobile = String(mobile);

        if (password) {
            const pwdErr = validatePasswordStrength(password);
            if (pwdErr) {
                return response.status(400).json({ message: pwdErr, error: true, success: false });
            }
            if (full.password) {
                if (!currentPassword || !(await bcrypt.compare(currentPassword, full.password))) {
                    return response.status(400).json({
                        message: 'Current password is incorrect',
                        error: true,
                        success: false,
                    });
                }
            }
            fields.password = await bcrypt.hash(password, 10);
        }

        if (fields.email && fields.email !== full.email) {
            const taken = await findUserByEmail(fields.email);
            if (taken && taken.id !== full.id) {
                return response.status(400).json({ message: 'Email already in use', error: true, success: false });
            }
        }

        await updateUser(request.userId, fields);
        return response.json({ message: 'Updated successfully', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function forgotPasswordController(request, response) {
    try {
        const { email } = request.body;
        const generic =
            'If an account exists for that email, we sent reset instructions.';
        if (!email) {
            return response.status(400).json({ message: 'provide email', error: true, success: false });
        }
        const user = await findUserByEmail(email);
        if (!user) {
            return response.json({ message: generic, error: false, success: true });
        }
        const otp = String(generateOtp());
        const expireTime = new Date(Date.now() + 60 * 60 * 1000);
        await updateUser(user.id, { forgot_password_otp: otp, forgot_password_expiry: expireTime });
        try {
            await sendEmail({
                sendTo: email,
                subject: 'Forgot Password',
                html: forgotPasswordTemplate({ name: user.name, otp }),
            });
        } catch {
            // Avoid enumeration — same response as sent path
        }
        return response.json({ message: generic, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function verifyForgotPasswordOtp(request, response) {
    try {
        const { email, otp } = request.body;
        if (!email || !otp) {
            return response.status(400).json({
                message: 'Provide required field email, otp.',
                error: true,
                success: false,
            });
        }
        const user = await findUserByEmail(email);
        if (!user) {
            return response.status(400).json({
                message: 'Invalid or expired OTP',
                error: true,
                success: false,
            });
        }
        if (!user.forgot_password_expiry || new Date(user.forgot_password_expiry) < new Date()) {
            return response.status(400).json({ message: 'Invalid or expired OTP', error: true, success: false });
        }
        if (String(otp) !== String(user.forgot_password_otp)) {
            return response.status(400).json({ message: 'Invalid or expired OTP', error: true, success: false });
        }
        const resetDeadline = new Date(Date.now() + 30 * 60 * 1000);
        await updateUser(user.id, {
            forgot_password_otp: PASSWORD_RESET_VERIFIED,
            forgot_password_expiry: resetDeadline,
        });
        return response.json({ message: 'Verify otp successfully', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function resetpassword(request, response) {
    try {
        const { email, newPassword, confirmPassword } = request.body;
        if (!email || !newPassword || !confirmPassword) {
            return response.status(400).json({
                message: 'provide required fields email, newPassword, confirmPassword',
                error: true,
                success: false,
            });
        }
        const pwdErr = validatePasswordStrength(newPassword);
        if (pwdErr) {
            return response.status(400).json({ message: pwdErr, error: true, success: false });
        }
        const user = await findUserByEmail(email);
        if (
            !user ||
            user.forgot_password_otp !== PASSWORD_RESET_VERIFIED ||
            !user.forgot_password_expiry ||
            new Date(user.forgot_password_expiry) < new Date()
        ) {
            return response.status(400).json({
                message: 'Unable to reset password. Complete OTP verification first.',
                error: true,
                success: false,
            });
        }
        if (newPassword !== confirmPassword) {
            return response.status(400).json({
                message: 'newPassword and confirmPassword must be same.',
                error: true,
                success: false,
            });
        }
        await updateUser(user.id, {
            password: await bcrypt.hash(newPassword, 10),
            forgot_password_otp: null,
            forgot_password_expiry: null,
        });
        return response.json({ message: 'Password updated successfully.', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function refreshToken(request, response) {
    try {
        const token = request.cookies.refreshToken || request.headers.authorization?.split(' ')[1];
        if (!token) {
            return response.status(401).json({ message: 'Invalid token', error: true, success: false });
        }

        let userId;
        try {
            const verifyToken = jwt.verify(token, getRefreshSecret(), JWT_VERIFY_OPTIONS);
            userId = verifyToken.id ?? verifyToken._id;
        } catch {
            clearAuthCookies(response);
            return response.status(401).json({ message: 'Invalid token', error: true, success: false });
        }

        const userAuth = await findUserAuthById(userId);
        if (!userAuth || userAuth.status !== 'Active') {
            clearAuthCookies(response);
            return response.status(401).json({ message: 'Invalid token', error: true, success: false });
        }

        const stored = userAuth.refresh_token;
        if (!stored || stored !== token) {
            await updateUser(userId, { refresh_token: '' });
            clearAuthCookies(response);
            await logSecurityEvent({
                userId,
                action: 'refresh_token_reuse',
                ip: getClientIp(request),
                userAgent: getUserAgent(request),
                success: false,
                details: {},
            }).catch(() => {});
            return response.status(401).json({ message: 'Invalid token', error: true, success: false });
        }

        const accesstoken = await generateAccessToken(userId);
        const newRefresh = await generateRefreshToken(userId);
        response.cookie('accessToken', accesstoken, getAccessCookieOptions());
        response.cookie('refreshToken', newRefresh, getRefreshCookieOptions());
        const csrfToken = generateCsrfToken();
        setCsrfCookie(response, csrfToken);

        await logSecurityEvent({
            userId,
            action: 'refresh_rotate',
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
            success: true,
            details: {},
        }).catch(() => {});

        return response.json({
            message: 'Session refreshed',
            error: false,
            success: true,
            data: { accesstoken, refreshToken: newRefresh, csrfToken },
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function userDetails(request, response) {
    try {
        const user = await findUserPublicById(request.userId);
        return response.json({ message: 'user details', data: user, error: false, success: true });
    } catch {
        return response.status(500).json({ message: 'Something is wrong', error: true, success: false });
    }
}

export async function exportAccountController(request, response) {
    try {
        const data = await exportUserData(request.userId);
        return response.json({
            message: 'Account export',
            error: false,
            success: true,
            data,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function deleteAccountController(request, response) {
    try {
        const { confirm, password } = request.body || {};
        if (confirm !== 'DELETE') {
            return response.status(400).json({
                message: 'Confirmation required: send confirm === "DELETE"',
                error: true,
                success: false,
            });
        }
        const user = await findUserById(request.userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }
        if (user.password) {
            if (!password || !(await bcrypt.compare(password, user.password))) {
                return response.status(400).json({
                    message: 'Password is incorrect',
                    error: true,
                    success: false,
                });
            }
        }

        await logSecurityEvent({
            userId: request.userId,
            action: 'account.deleted',
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
            success: true,
            details: {},
        }).catch(() => {});

        clearAuthCookies(response);
        await deleteUserAccount(request.userId);
        return response.json({ message: 'Account deleted', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function applyForSellerController(request, response) {
    try {
        const user = await findUserById(request.userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }
        if (user.role === 'Admin') {
            return response.status(400).json({
                message: 'Admins cannot apply as sellers',
                error: true,
                success: false,
            });
        }
        if (user.role === 'Seller') {
            return response.status(400).json({
                message: 'You are already a seller',
                error: true,
                success: false,
            });
        }
        if (user.seller_request) {
            return response.status(400).json({
                message: 'Seller application is already pending review',
                error: true,
                success: false,
            });
        }
        await updateUser(request.userId, { seller_request: true });
        return response.json({
            message: 'Seller application submitted',
            error: false,
            success: true,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function getCsrfController(request, response) {
    try {
        if (!request.userId) {
            return response.status(401).json({ message: 'Not authorized', error: true, success: false });
        }
        const csrfToken = generateCsrfToken();
        setCsrfCookie(response, csrfToken);
        return response.json({ data: { csrfToken }, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/** First-time mobile PIN (hashed). Password accounts must send `password`; Google-only may omit. */
export async function setupPinController(request, response) {
    try {
        const { pin, confirmPin, password } = request.body || {};
        const user = await findUserById(request.userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }
        if (user.pin_hash) {
            return response.status(400).json({
                message: 'PIN already set. Use change-pin or forgot-pin to update.',
                error: true,
                success: false,
            });
        }
        if (user.password) {
            if (!password || !(await bcrypt.compare(password, user.password))) {
                return response.status(400).json({
                    message: 'Current account password is required and must be correct',
                    error: true,
                    success: false,
                });
            }
        }
        const err = validatePinFormat(pin);
        if (err) {
            return response.status(400).json({ message: err, error: true, success: false });
        }
        if (String(pin) !== String(confirmPin)) {
            return response.status(400).json({ message: 'pin and confirmPin must match', error: true, success: false });
        }
        await updateUser(user.id, { pin_hash: await bcrypt.hash(String(pin).trim(), 10) });
        await logSecurityEvent({
            userId: user.id,
            action: 'pin.setup',
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
            success: true,
            details: {},
        }).catch(() => {});
        return response.json({ message: 'PIN created', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/** Change PIN while logged in (requires current PIN). */
export async function changePinController(request, response) {
    try {
        const { currentPin, pin, confirmPin } = request.body || {};
        const user = await findUserById(request.userId);
        if (!user?.pin_hash) {
            return response.status(400).json({ message: 'No PIN set. Use setup-pin first.', error: true, success: false });
        }
        if (!currentPin || !(await bcrypt.compare(String(currentPin).trim(), user.pin_hash))) {
            return response.status(400).json({ message: 'Current PIN is incorrect', error: true, success: false });
        }
        const err = validatePinFormat(pin);
        if (err) {
            return response.status(400).json({ message: err, error: true, success: false });
        }
        if (String(pin) !== String(confirmPin)) {
            return response.status(400).json({ message: 'pin and confirmPin must match', error: true, success: false });
        }
        await updateUser(user.id, { pin_hash: await bcrypt.hash(String(pin).trim(), 10) });
        await logSecurityEvent({
            userId: user.id,
            action: 'pin.change',
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
            success: true,
            details: {},
        }).catch(() => {});
        return response.json({ message: 'PIN updated', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

const FORGOT_PIN_GENERIC = 'If an account exists for that email, we sent PIN reset instructions.';

/** Email OTP to reset PIN (does not affect password). */
export async function forgotPinController(request, response) {
    try {
        const { email } = request.body || {};
        if (!email) {
            return response.status(400).json({ message: 'provide email', error: true, success: false });
        }
        const user = await findUserByEmail(String(email).trim());
        if (!user?.pin_hash) {
            return response.json({ message: FORGOT_PIN_GENERIC, error: false, success: true });
        }
        const otp = String(generateOtp());
        const expireTime = new Date(Date.now() + 60 * 60 * 1000);
        await updateUser(user.id, { pin_reset_otp: otp, pin_reset_expiry: expireTime });
        const html = `
            <p>Hi ${user.name || 'there'},</p>
            <p>Use this code to reset your app PIN:</p>
            <p style="font-size:22px;font-weight:bold">${otp}</p>
            <p>Valid for 1 hour. If you did not request this, ignore this email.</p>`;
        try {
            await sendEmail({
                sendTo: user.email,
                subject: 'Reset your app PIN',
                html,
            });
        } catch {
            /* same generic response */
        }
        return response.json({ message: FORGOT_PIN_GENERIC, error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function verifyForgotPinOtpController(request, response) {
    try {
        const { email, otp } = request.body || {};
        if (!email || !otp) {
            return response.status(400).json({
                message: 'Provide email and otp.',
                error: true,
                success: false,
            });
        }
        const user = await findUserByEmail(String(email).trim());
        if (!user?.pin_hash) {
            return response.status(400).json({ message: 'Invalid or expired OTP', error: true, success: false });
        }
        if (!user.pin_reset_expiry || new Date(user.pin_reset_expiry) < new Date()) {
            return response.status(400).json({ message: 'Invalid or expired OTP', error: true, success: false });
        }
        if (String(otp) !== String(user.pin_reset_otp)) {
            return response.status(400).json({ message: 'Invalid or expired OTP', error: true, success: false });
        }
        const resetDeadline = new Date(Date.now() + 30 * 60 * 1000);
        await updateUser(user.id, {
            pin_reset_otp: PIN_RESET_VERIFIED,
            pin_reset_expiry: resetDeadline,
        });
        return response.json({ message: 'OTP verified. You can set a new PIN.', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/** After verify-forgot-pin-otp, set new PIN (unauthenticated). */
export async function resetPinController(request, response) {
    try {
        const { email, newPin, confirmPin } = request.body || {};
        if (!email || !newPin || !confirmPin) {
            return response.status(400).json({
                message: 'email, newPin, and confirmPin are required',
                error: true,
                success: false,
            });
        }
        const user = await findUserByEmail(String(email).trim());
        if (
            !user?.pin_hash ||
            user.pin_reset_otp !== PIN_RESET_VERIFIED ||
            !user.pin_reset_expiry ||
            new Date(user.pin_reset_expiry) < new Date()
        ) {
            return response.status(400).json({
                message: 'Unable to reset PIN. Complete OTP verification first.',
                error: true,
                success: false,
            });
        }
        const err = validatePinFormat(newPin);
        if (err) {
            return response.status(400).json({ message: err, error: true, success: false });
        }
        if (String(newPin) !== String(confirmPin)) {
            return response.status(400).json({ message: 'newPin and confirmPin must match', error: true, success: false });
        }
        await updateUser(user.id, {
            pin_hash: await bcrypt.hash(String(newPin).trim(), 10),
            pin_reset_otp: null,
            pin_reset_expiry: null,
        });
        return response.json({ message: 'PIN updated successfully.', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/** Mobile quick login with email + PIN (requires verified email and an existing PIN). */
export async function loginPinController(request, response) {
    try {
        const { email, pin } = request.body || {};
        if (!email || pin == null || pin === '') {
            return response.status(400).json({ message: 'provide email and pin', error: true, success: false });
        }
        const user = await findUserByEmail(String(email).trim());
        const lockMsg = await checkAccountLockout(user);
        if (lockMsg) {
            return response.status(423).json({ message: lockMsg, error: true, success: false });
        }
        if (!user || user.status !== 'Active') {
            await recordLoginFailure(user?.id ?? null, request);
            return response.status(400).json({ message: GENERIC_LOGIN_FAIL, error: true, success: false });
        }
        if (!user.pin_hash) {
            await recordLoginFailure(user.id, request);
            return response.status(400).json({
                message: 'PIN login not enabled for this account. Sign in with password and set up a PIN.',
                error: true,
                success: false,
            });
        }
        if (!(await bcrypt.compare(String(pin).trim(), user.pin_hash))) {
            await recordLoginFailure(user.id, request);
            return response.status(400).json({ message: GENERIC_LOGIN_FAIL, error: true, success: false });
        }
        if (mustVerifyEmailBeforeLogin(user)) {
            return response.status(403).json({
                message: 'Please verify your email before signing in',
                error: true,
                success: false,
            });
        }
        const tokens = await issueAuthCookies(response, user.id, request);
        return response.json({
            message: 'Login successfully',
            error: false,
            success: true,
            data: tokens,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

/** Soft-disable account; user stays in DB. Reactivate via admin `PUT /api/admin/users/:id/status`. */
export async function deactivateAccountController(request, response) {
    try {
        const { confirm, password } = request.body || {};
        if (confirm !== 'DEACTIVATE') {
            return response.status(400).json({
                message: 'Confirmation required: send confirm === "DEACTIVATE"',
                error: true,
                success: false,
            });
        }
        const user = await findUserById(request.userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }
        if (user.password) {
            if (!password || !(await bcrypt.compare(password, user.password))) {
                return response.status(400).json({
                    message: 'Password is incorrect',
                    error: true,
                    success: false,
                });
            }
        }
        await logSecurityEvent({
            userId: request.userId,
            action: 'account.deactivated',
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
            success: true,
            details: {},
        }).catch(() => {});

        clearAuthCookies(response);
        await updateUser(request.userId, {
            status: 'Inactive',
            refresh_token: '',
            pin_hash: null,
            pin_reset_otp: null,
            pin_reset_expiry: null,
        });
        return response.json({ message: 'Account deactivated', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}
