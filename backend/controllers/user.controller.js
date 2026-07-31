/**
 * Auth & account HTTP handlers for `/api/user` (register, login, Google, **mobile PIN**,
 * refresh, profile, seller apply, GDPR, **deactivate**). Cookies + CSRF: see `issueAuthCookies`, `middleware/csrf.js`.
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

import sendEmail, { sendEmailDirect } from '../config/sendEmail.js';
import { enqueueEmail } from '../models/emailQueue.model.js';
import {
    getAccessCookieOptions,
    getRefreshCookieOptions,
    getClearAccessCookieOptions,
    getClearRefreshCookieOptions,
    getClearCsrfCookieOptions,
    getRefreshSecret,
    getAccessSecret,
    JWT_VERIFY_OPTIONS,
} from '../config/security.js';
import { extractRefreshToken } from '../utils/extractAuthToken.js';
import verifyEmailTemplate from '../utils/verifyEmailTemplate.js';
import generateAccessToken from '../utils/generateAccessToken.js';
import generateRefreshToken from '../utils/generatedRefreshToken.js';
import uploadImageCloudinary from '../utils/uploadImageCloudinary.js';
import generateOtp from '../utils/generateOtp.js';
import forgotPasswordTemplate from '../utils/forgotPasswordTemplate.js';
import { validatePasswordStrength } from '../utils/password.js';
import {
    hashPassword,
    comparePassword,
    rehashPasswordIfNeeded,
} from '../utils/passwordHash.js';
import { validatePinFormat } from '../utils/pin.js';
import { pickId } from '../utils/sql.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';
import { generateCsrfToken, setCsrfCookie, timingSafeEqualStr } from '../middleware/csrf.js';
import {
    checkAccountLockout,
    recordLoginFailure,
    recordLoginSuccess,
} from '../middleware/abuseGuard.js';
import { logSecurityEvent } from '../models/securityEvent.model.js';
import {
    authLoginAttempts,
    authLoginDuration,
    authRefreshDuration,
} from '../config/metrics.js';
import { biz } from '../config/businessMetrics.js';
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
} from '../models/user.model.js';
import { normalizeNotificationPrefs } from '../utils/notificationPrefs.js';
import pool from '../config/connectDB.js';
import { randomBase32Secret, totpKeyUri, verifyTotpCode } from '../utils/totp.js';
import { findReviewsByUser } from '../models/review.model.js';

export const PASSWORD_RESET_VERIFIED = 'VERIFIED';
/** Same marker pattern in `pin_reset_otp` after email OTP is verified (before `reset-pin`). */
export const PIN_RESET_VERIFIED = PASSWORD_RESET_VERIFIED;

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
const googleOAuthClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const REGISTER_RESPONSE_MSG =
    'Registration successful. Check your email for a 6-digit verification code.';
const VERIFY_EMAIL_OTP_TTL_MS = 60 * 60 * 1000;
const RESEND_VERIFY_GENERIC =
    'If an unverified account exists for that email, we sent a new verification code.';

function packVerifyEmailOtp(otp, expiresAt) {
    return `${String(otp)}.${expiresAt.getTime()}`;
}

function parseVerifyEmailOtp(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const dot = token.indexOf('.');
    const otp = token.slice(0, dot);
    const ms = Number(token.slice(dot + 1));
    if (!/^\d{4,8}$/.test(otp) || !Number.isFinite(ms)) return null;
    return { otp, expiresAt: new Date(ms) };
}

function isAutoVerifyEmailEnabled() {
    return (
        process.env.NODE_ENV !== 'production' ||
        String(process.env.AUTO_VERIFY_EMAIL || '').toLowerCase() === 'true'
    );
}

/** Issue a fresh email-verify OTP and send it via SMTP immediately (not the queue). */
async function issueAndSendVerifyEmailOtp(user) {
    const otp = String(generateOtp());
    const expiresAt = new Date(Date.now() + VERIFY_EMAIL_OTP_TTL_MS);
    await updateUser(user.id, { verify_email_token: packVerifyEmailOtp(otp, expiresAt) });
    const mail = {
        sendTo: user.email,
        subject: 'Your Matina Crafts verification code',
        html: verifyEmailTemplate({ name: user.name, otp }),
        text: `Hi ${user.name || 'there'}, your Matina Crafts email verification code is ${otp}. It expires in 1 hour.`,
    };
    try {
        await sendEmailDirect(mail);
    } catch {
        try {
            await enqueueEmail(mail);
        } catch {
            void sendEmail(mail).catch(() => {});
        }
    }
    return otp;
}

function clearAuthCookies(response) {
    const accessClear = getClearAccessCookieOptions();
    const refreshClear = getClearRefreshCookieOptions();
    const csrfClear = getClearCsrfCookieOptions();

    // clearCookie attributes must match those used at set time (Path/Secure/SameSite/Domain).
    response.clearCookie('accessToken', accessClear);
    response.clearCookie('token', accessClear); // legacy name
    response.clearCookie('refreshToken', refreshClear);
    response.clearCookie('csrfToken', csrfClear);

    // Safari / some Chromium builds: reinforce deletion with empty Max-Age=0 rewrite.
    response.cookie('accessToken', '', accessClear);
    response.cookie('token', '', accessClear);
    response.cookie('refreshToken', '', refreshClear);
    response.cookie('csrfToken', '', csrfClear);
}

/**
 * Issues httpOnly access/refresh cookies + readable CSRF cookie.
 * Tokens are never returned in the JSON body — only csrfToken (+ caller may attach user).
 */
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
    return { csrfToken };
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
        const autoVerify = isAutoVerifyEmailEnabled();
        const existing = await findUserByEmail(email);
        if (existing) {
            // Anti-enumeration: same shape as a new signup. Resend OTP only if still unverified.
            if (!autoVerify && !existing.verify_email) {
                try {
                    await issueAndSendVerifyEmailOtp(existing);
                } catch {
                    /* ignore — still return generic success */
                }
            }
            return response.json({
                message: REGISTER_RESPONSE_MSG,
                error: false,
                success: true,
                data: {
                    email: String(email).toLowerCase(),
                    requiresEmailVerification: !autoVerify && !existing.verify_email,
                },
            });
        }
        const hashed = await hashPassword(password);
        const save = await createUser({ name, email, password: hashed });
        const userId = pickId(save);

        if (autoVerify) {
            await updateUser(userId, { verify_email: true, verify_email_token: null });
        } else {
            try {
                await issueAndSendVerifyEmailOtp({ id: userId, email: save.email, name: save.name });
            } catch (err) {
                await logSecurityEvent({
                    userId,
                    action: 'auth.register_email_failed',
                    ip: getClientIp(request),
                    userAgent: getUserAgent(request),
                    success: false,
                    details: { reason: String(err?.message || err) },
                }).catch(() => {});
            }
        }

        await logSecurityEvent({
            userId,
            action: 'auth.register',
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
            success: true,
            details: {},
        }).catch(() => {});

        biz.userRegistered();
        return response.json({
            message: REGISTER_RESPONSE_MSG,
            error: false,
            success: true,
            data: {
                name: save.name,
                email: save.email,
                requiresEmailVerification: !autoVerify,
            },
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function verifyEmailController(request, response) {
    try {
        const email = request.body?.email ? String(request.body.email).trim().toLowerCase() : '';
        const otp = String(request.body?.otp || request.body?.code || '').trim();
        if (!otp) {
            return response.status(400).json({ message: 'Enter the verification code', error: true, success: false });
        }

        // Preferred: email + OTP from signup flow
        if (email) {
            const user = await findUserByEmail(email);
            if (!user) {
                return response.status(400).json({ message: 'Invalid or expired code', error: true, success: false });
            }
            if (user.verify_email) {
                return response.json({ message: 'Email already verified', success: true, error: false });
            }
            const packed = parseVerifyEmailOtp(user.verify_email_token);
            if (
                !packed ||
                String(otp) !== String(packed.otp) ||
                !packed.expiresAt ||
                packed.expiresAt < new Date()
            ) {
                return response.status(400).json({ message: 'Invalid or expired code', error: true, success: false });
            }
            await updateUser(user.id, { verify_email: true, verify_email_token: null });
            biz.emailVerified();
            return response.json({ message: 'Email verified. You can sign in now.', success: true, error: false });
        }

        // Legacy: long link token stored as verify_email_token
        const user = await findUserByVerifyToken(otp);
        if (!user) {
            return response.status(400).json({ message: 'Invalid or expired code', error: true, success: false });
        }
        await updateUser(user.id, { verify_email: true, verify_email_token: null });
        biz.emailVerified();
        return response.json({ message: 'Email verified. You can sign in now.', success: true, error: false });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function resendVerifyEmailController(request, response) {
    try {
        const email = request.body?.email ? String(request.body.email).trim().toLowerCase() : '';
        if (!email) {
            return response.status(400).json({ message: 'provide email', error: true, success: false });
        }
        if (isAutoVerifyEmailEnabled()) {
            return response.json({ message: RESEND_VERIFY_GENERIC, error: false, success: true });
        }
        const user = await findUserByEmail(email);
        if (user && !user.verify_email) {
            await issueAndSendVerifyEmailOtp(user);
        }
        return response.json({ message: RESEND_VERIFY_GENERIC, error: false, success: true });
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
    const endLogin = authLoginDuration.startTimer();
    let outcome;
    try {
        const { email, password } = request.body;
        if (!email || !password) {
            outcome = 'invalid_input';
            return response.status(400).json({ message: 'provide email, password', error: true, success: false });
        }
        const user = await findUserByEmail(email);
        const lockMsg = await checkAccountLockout(user);
        if (lockMsg) {
            outcome = 'locked';
            return response.status(423).json({ message: lockMsg, error: true, success: false });
        }
        if (!user || user.status !== 'Active') {
            await recordLoginFailure(user?.id ?? null, request);
            authLoginAttempts.inc({ outcome: 'failure' });
            outcome = 'failure';
            biz.loginFailed();
            return response.status(400).json({ message: GENERIC_LOGIN_FAIL, error: true, success: false });
        }
        if (!user.password || !(await comparePassword(password, user.password))) {
            await recordLoginFailure(user.id, request);
            authLoginAttempts.inc({ outcome: 'failure' });
            outcome = 'failure';
            biz.loginFailed();
            return response.status(400).json({ message: GENERIC_LOGIN_FAIL, error: true, success: false });
        }
        if (mustVerifyEmailBeforeLogin(user)) {
            outcome = 'unverified';
            return response.status(403).json({
                message: 'Please verify your email before signing in',
                error: true,
                success: false,
            });
        }

        await rehashPasswordIfNeeded(user.id, password, user.password, updateUser);

        const twoFaResponse = await maybeRequireTwoFactor(response, user);
        if (twoFaResponse) {
            outcome = 'success';
            return twoFaResponse;
        }

        const { csrfToken } = await issueAuthCookies(response, user.id, request);
        const publicUser = await findUserPublicById(user.id);
        authLoginAttempts.inc({ outcome: 'success' });
        biz.loginSuccess();
        outcome = 'success';
        return response.json({
            message: 'Login successfully',
            error: false,
            success: true,
            data: { csrfToken, user: publicUser },
        });
    } catch (error) {
        outcome = 'error';
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    } finally {
        endLogin({ outcome: outcome || 'error' });
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
                    ...(name ? { name } : {}),
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
        } else if (picture || name) {
            // Keep Google photo/name fresh on every sign-in
            await updateUser(user.id, {
                ...(picture ? { avatar: picture } : {}),
                ...(name ? { name } : {}),
            });
            user = await findUserById(user.id);
        }

        if (!user || user.status !== 'Active') {
            return response.status(403).json({ message: 'Account not active', error: true, success: false });
        }

        const twoFaResponse = await maybeRequireTwoFactor(response, user);
        if (twoFaResponse) return twoFaResponse;

        const { csrfToken } = await issueAuthCookies(response, user.id, request);
        const publicUser = await findUserPublicById(user.id);
        biz.googleLogin();
        biz.loginSuccess();
        return response.json({
            message: 'Login successfully',
            error: false,
            success: true,
            data: { csrfToken, user: publicUser },
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function logOutController(request, response) {
    try {
        clearAuthCookies(response);
        if (request.userId) {
            await updateUser(request.userId, {
                refresh_token: '',
                refresh_token_prev: '',
                refresh_token_prev_until: null,
            });
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
        biz.uploadOk();
        return response.json({
            message: 'upload profile',
            success: true,
            error: false,
            data: { _id: request.userId, avatar: url },
        });
    } catch (error) {
        biz.uploadFail();
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function updateUserDetails(request, response) {
    try {
        const { name, email, mobile, bio, password, currentPassword } = request.body;
        const full = await findUserById(request.userId);
        if (!full) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }

        const fields = {};
        if (name) fields.name = name;
        if (email) fields.email = email;
        if (mobile !== undefined && mobile !== null) fields.mobile = String(mobile);
        if (bio !== undefined && bio !== null) fields.bio = String(bio).slice(0, 2000);

        if (password) {
            const pwdErr = validatePasswordStrength(password);
            if (pwdErr) {
                return response.status(400).json({ message: pwdErr, error: true, success: false });
            }
            if (full.password) {
                if (!currentPassword || !(await comparePassword(currentPassword, full.password))) {
                    return response.status(400).json({
                        message: 'Current password is incorrect',
                        error: true,
                        success: false,
                    });
                }
            }
            fields.password = await hashPassword(password);
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
            'If an account exists for that email, we sent a 6-digit reset code.';
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
        const mail = {
            sendTo: email,
            subject: 'Your Matina Crafts password reset code',
            html: forgotPasswordTemplate({ name: user.name, otp }),
            text: `Hi ${user.name || 'there'}, your Matina Crafts password reset code is ${otp}. It expires in 1 hour.`,
        };
        // OTP is time-sensitive — send via SMTP now (do not wait on the email worker).
        try {
            await sendEmailDirect(mail);
        } catch {
            try {
                await enqueueEmail(mail);
            } catch {
                void sendEmail(mail).catch(() => {});
            }
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
            password: await hashPassword(newPassword),
            forgot_password_otp: null,
            forgot_password_expiry: null,
        });
        biz.passwordReset();
        return response.json({ message: 'Password updated successfully.', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function refreshToken(request, response) {
    const endRefresh = authRefreshDuration.startTimer();
    let outcome;
    try {
        const extracted = extractRefreshToken(request);
        if (extracted.error === 'malformed_authorization') {
            outcome = 'invalid';
            return response.status(401).json({ message: 'Invalid token', error: true, success: false });
        }
        const token = extracted.token;
        if (!token) {
            outcome = 'invalid';
            return response.status(401).json({ message: 'Invalid token', error: true, success: false });
        }

        let userId;
        try {
            const verifyToken = jwt.verify(token, getRefreshSecret(), JWT_VERIFY_OPTIONS);
            userId = verifyToken.id ?? verifyToken._id;
        } catch {
            clearAuthCookies(response);
            outcome = 'invalid';
            return response.status(401).json({ message: 'Invalid token', error: true, success: false });
        }

        const userAuth = await findUserAuthById(userId);
        if (!userAuth || userAuth.status !== 'Active') {
            clearAuthCookies(response);
            outcome = 'invalid';
            return response.status(401).json({ message: 'Invalid token', error: true, success: false });
        }

        const stored = userAuth.refresh_token;
        const prev = userAuth.refresh_token_prev || '';
        const prevUntil = userAuth.refresh_token_prev_until
            ? new Date(userAuth.refresh_token_prev_until)
            : null;
        const matchesCurrent = stored && timingSafeEqualStr(String(stored), String(token));
        const matchesPrev =
            prev &&
            prevUntil &&
            prevUntil > new Date() &&
            timingSafeEqualStr(String(prev), String(token));

        if (!matchesCurrent && !matchesPrev) {
            await updateUser(userId, {
                refresh_token: '',
                refresh_token_prev: '',
                refresh_token_prev_until: null,
            });
            clearAuthCookies(response);
            await logSecurityEvent({
                userId,
                action: 'refresh_token_reuse',
                ip: getClientIp(request),
                userAgent: getUserAgent(request),
                success: false,
                details: {},
            }).catch(() => {});
            outcome = 'reuse';
            return response.status(401).json({ message: 'Invalid token', error: true, success: false });
        }

        // Concurrent tab used the pre-rotation token within grace: re-issue access + current refresh.
        if (matchesPrev && !matchesCurrent) {
            const accesstoken = await generateAccessToken(userId);
            response.cookie('accessToken', accesstoken, getAccessCookieOptions());
            response.cookie('refreshToken', stored, getRefreshCookieOptions());
            const csrfToken = generateCsrfToken();
            setCsrfCookie(response, csrfToken);
            outcome = 'grace';
            return response.json({
                message: 'Session refreshed',
                error: false,
                success: true,
                data: { csrfToken },
            });
        }

        const accesstoken = await generateAccessToken(userId);
        let newRefresh;
        try {
            newRefresh = await generateRefreshToken(userId, { previousToken: token });
        } catch (rotateErr) {
            if (rotateErr?.code === 'REFRESH_CONCURRENT') {
                // Another tab won the rotation — fall through to grace path with fresh row
                const again = await findUserAuthById(userId);
                const accesstoken2 = await generateAccessToken(userId);
                response.cookie('accessToken', accesstoken2, getAccessCookieOptions());
                response.cookie('refreshToken', again.refresh_token, getRefreshCookieOptions());
                const csrfToken = generateCsrfToken();
                setCsrfCookie(response, csrfToken);
                outcome = 'grace';
                return response.json({
                    message: 'Session refreshed',
                    error: false,
                    success: true,
                    data: { csrfToken },
                });
            }
            throw rotateErr;
        }
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

        outcome = 'success';
        return response.json({
            message: 'Session refreshed',
            error: false,
            success: true,
            data: { csrfToken },
        });
    } catch (error) {
        outcome = 'error';
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    } finally {
        endRefresh({ outcome: outcome || 'error' });
    }
}

export async function userDetails(request, response) {
    try {
        const user = await findUserPublicById(request.userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }
        const prefs = normalizeNotificationPrefs(user.notification_prefs);
        return response.json({
            message: 'user details',
            data: {
                ...user,
                totpEnabled: Boolean(user.totp_enabled),
                notification_prefs: prefs,
                notificationPrefs: prefs,
            },
            error: false,
            success: true,
        });
    } catch {
        return response.status(500).json({ message: 'Something is wrong', error: true, success: false });
    }
}

export async function getPreferencesController(request, response) {
    try {
        const user = await findUserPublicById(request.userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }
        const prefs = normalizeNotificationPrefs(user.notification_prefs);
        let shareUrl = null;
        if (prefs.shareWishlist) {
            const { findActiveWishlistShareByUser } = await import('../models/wishlistShare.model.js');
            const share = await findActiveWishlistShareByUser(request.userId);
            if (share?.token) {
                const { getTrustedFrontendBaseUrl } = await import('../config/security.js');
                shareUrl = `${getTrustedFrontendBaseUrl().replace(/\/$/, '')}/wishlist/shared/${share.token}`;
            }
        }
        return response.json({
            message: 'Preferences',
            data: {
                ...prefs,
                totpEnabled: Boolean(user.totp_enabled),
                shareUrl,
                twilioConfigured: Boolean(
                    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
                ),
                webPushConfigured: Boolean(
                    process.env.WEB_PUSH_VAPID_PUBLIC_KEY && process.env.WEB_PUSH_VAPID_PRIVATE_KEY,
                ),
            },
            error: false,
            success: true,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

async function syncMarketingNewsletter(email, enabled) {
    const normalized = String(email || '')
        .trim()
        .toLowerCase();
    if (!normalized) return;
    if (enabled) {
        await pool.query(
            `INSERT INTO newsletter_subscribers (email, source, active)
             VALUES ($1, 'account-settings', true)
             ON CONFLICT (email) DO UPDATE SET
               active = true,
               updated_at = NOW()`,
            [normalized],
        );
    } else {
        await pool.query(
            `UPDATE newsletter_subscribers
             SET active = false, updated_at = NOW()
             WHERE email = $1`,
            [normalized],
        );
    }
}

export async function updatePreferencesController(request, response) {
    try {
        const user = await findUserById(request.userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }

        const current = normalizeNotificationPrefs(user.notification_prefs);
        const body = request.body || {};
        const next = normalizeNotificationPrefs({
            orderUpdates:
                typeof body.orderUpdates === 'boolean' ? body.orderUpdates : current.orderUpdates,
            marketingEmails:
                typeof body.marketingEmails === 'boolean'
                    ? body.marketingEmails
                    : current.marketingEmails,
            reviewRequests:
                typeof body.reviewRequests === 'boolean'
                    ? body.reviewRequests
                    : current.reviewRequests,
            publicProfile:
                typeof body.publicProfile === 'boolean'
                    ? body.publicProfile
                    : current.publicProfile,
            smsNotifications:
                typeof body.smsNotifications === 'boolean'
                    ? body.smsNotifications
                    : current.smsNotifications,
            pushNotifications:
                typeof body.pushNotifications === 'boolean'
                    ? body.pushNotifications
                    : current.pushNotifications,
            shareWishlist:
                typeof body.shareWishlist === 'boolean'
                    ? body.shareWishlist
                    : current.shareWishlist,
        });

        if (next.smsNotifications && !String(user.mobile || '').trim()) {
            return response.status(400).json({
                message: 'Add a mobile number to your profile before enabling SMS notifications',
                error: true,
                success: false,
            });
        }

        await updateUser(request.userId, { notification_prefs: next });

        if (next.marketingEmails !== current.marketingEmails) {
            await syncMarketingNewsletter(user.email, next.marketingEmails).catch(() => {});
        }

        if (next.shareWishlist && !current.shareWishlist) {
            const { createOrRefreshWishlistShare } = await import('../models/wishlistShare.model.js');
            await createOrRefreshWishlistShare(request.userId).catch(() => {});
        } else if (!next.shareWishlist && current.shareWishlist) {
            const { deactivateWishlistShares } = await import('../models/wishlistShare.model.js');
            await deactivateWishlistShares(request.userId).catch(() => {});
        }

        if (!next.pushNotifications && current.pushNotifications) {
            const { deleteAllPushSubscriptionsForUser } = await import(
                '../models/pushSubscription.model.js'
            );
            await deleteAllPushSubscriptionsForUser(request.userId).catch(() => {});
        }

        let shareLink = null;
        if (next.shareWishlist) {
            const { findActiveWishlistShareByUser } = await import('../models/wishlistShare.model.js');
            const { getTrustedFrontendBaseUrl } = await import('../config/security.js');
            const share = await findActiveWishlistShareByUser(request.userId);
            if (share?.token) {
                shareLink = `${getTrustedFrontendBaseUrl().replace(/\/$/, '')}/wishlist/shared/${share.token}`;
            }
        }

        return response.json({
            message: 'Preferences updated',
            data: {
                ...next,
                totpEnabled: Boolean(user.totp_enabled),
                shareUrl: shareLink,
                twilioConfigured: Boolean(
                    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
                ),
                webPushConfigured: Boolean(
                    process.env.WEB_PUSH_VAPID_PUBLIC_KEY && process.env.WEB_PUSH_VAPID_PRIVATE_KEY,
                ),
            },
            error: false,
            success: true,
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

function hashTwoFactorEmailOtp(otp) {
    return crypto.createHmac('sha256', getAccessSecret()).update(String(otp)).digest('hex');
}

function createTwoFactorTempToken(userId, emailOtpHash = null) {
    const payload = { id: userId, purpose: '2fa' };
    if (emailOtpHash) payload.emailOtpHash = emailOtpHash;
    return jwt.sign(payload, getAccessSecret(), { expiresIn: '5m', algorithm: 'HS256' });
}

function verifyTwoFactorTempToken(token) {
    const payload = jwt.verify(String(token || ''), getAccessSecret(), {
        ...JWT_VERIFY_OPTIONS,
        algorithms: ['HS256'],
    });
    if (!payload || payload.purpose !== '2fa' || !payload.id) {
        throw new Error('Invalid 2FA token');
    }
    return {
        id: payload.id,
        emailOtpHash: typeof payload.emailOtpHash === 'string' ? payload.emailOtpHash : null,
    };
}

async function maybeRequireTwoFactor(response, user) {
    if (!user?.totp_enabled || !user?.totp_secret) return null;
    const tempToken = createTwoFactorTempToken(user.id);
    return response.json({
        message: 'Two-factor authentication required',
        error: false,
        success: true,
        data: {
            requires2fa: true,
            tempToken,
        },
    });
}

/** Email a backup 2FA login code (for users who cannot open their authenticator app). */
export async function sendTwoFactorEmailOtpController(request, response) {
    try {
        const { id: userId } = verifyTwoFactorTempToken(request.body?.tempToken);
        const user = await findUserById(userId);
        if (!user || user.status !== 'Active' || !user.totp_enabled) {
            return response.status(400).json({
                message: 'Invalid or expired 2FA session',
                error: true,
                success: false,
            });
        }
        const otp = String(generateOtp());
        const emailOtpHash = hashTwoFactorEmailOtp(otp);
        const tempToken = createTwoFactorTempToken(user.id, emailOtpHash);
        const html = `
          <div style="font-family:Georgia,serif;color:#2A170F;max-width:520px;margin:0 auto;padding:24px">
            <p style="margin:0 0 12px">Hi ${user.name || 'there'},</p>
            <p style="margin:0 0 16px;line-height:1.5">
              Use this backup code to finish signing in to Matina Crafts:
            </p>
            <div style="background:#FAF6F2;border:1px solid #E2D5C7;border-radius:12px;padding:20px;text-align:center;margin:0 0 16px">
              <p style="margin:0;font-size:28px;letter-spacing:0.35em;font-weight:bold;font-family:monospace">${otp}</p>
            </div>
            <p style="margin:0;font-size:13px;color:#664132">This code expires in 5 minutes.</p>
            <p style="margin:24px 0 0;font-size:13px">— Matina Crafts</p>
          </div>`;
        const text = `Your Matina Crafts sign-in backup code is ${otp}. It expires in 5 minutes.`;
        const mail = {
            sendTo: user.email,
            subject: 'Your Matina Crafts sign-in code',
            html,
            text,
        };
        try {
            await sendEmailDirect(mail);
        } catch (sendErr) {
            try {
                await enqueueEmail(mail);
            } catch {
                return response.status(502).json({
                    message:
                        sendErr?.message ||
                        'Could not send the email code. Check SMTP settings or try again.',
                    error: true,
                    success: false,
                });
            }
        }
        return response.json({
            message: 'We emailed a 6-digit backup code. Check inbox and spam.',
            error: false,
            success: true,
            data: { tempToken },
        });
    } catch (error) {
        return response.status(400).json({
            message: error.message || 'Invalid or expired 2FA session',
            error: true,
            success: false,
        });
    }
}

export async function setupTwoFactorController(request, response) {
    try {
        const user = await findUserById(request.userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }
        if (user.totp_enabled) {
            return response.status(400).json({
                message: 'Two-factor authentication is already enabled',
                error: true,
                success: false,
            });
        }
        const secret = randomBase32Secret();
        await updateUser(request.userId, { totp_secret: secret, totp_enabled: false });
        const otpauthUrl = totpKeyUri(secret, user.email);
        return response.json({
            message: 'Scan this QR code with your authenticator app, then confirm with a code',
            error: false,
            success: true,
            data: {
                secret,
                otpauthUrl,
                qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`,
            },
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function enableTwoFactorController(request, response) {
    try {
        const user = await findUserById(request.userId);
        if (!user?.totp_secret) {
            return response.status(400).json({
                message: 'Start 2FA setup first',
                error: true,
                success: false,
            });
        }
        if (!verifyTotpCode(user.totp_secret, request.body?.code)) {
            return response.status(400).json({ message: 'Invalid authenticator code', error: true, success: false });
        }
        await updateUser(request.userId, { totp_enabled: true });
        await logSecurityEvent({
            userId: request.userId,
            action: 'auth.2fa_enabled',
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
            success: true,
            details: {},
        }).catch(() => {});
        return response.json({
            message: 'Two-factor authentication enabled',
            error: false,
            success: true,
            data: { totpEnabled: true },
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function disableTwoFactorController(request, response) {
    try {
        const user = await findUserById(request.userId);
        if (!user) {
            return response.status(404).json({ message: 'User not found', error: true, success: false });
        }
        if (!user.totp_enabled) {
            return response.json({
                message: 'Two-factor authentication is already off',
                error: false,
                success: true,
                data: { totpEnabled: false },
            });
        }
        if (user.password) {
            if (
                !request.body?.password ||
                !(await comparePassword(request.body.password, user.password))
            ) {
                return response.status(400).json({
                    message: 'Password is incorrect',
                    error: true,
                    success: false,
                });
            }
        }
        if (!verifyTotpCode(user.totp_secret, request.body?.code)) {
            return response.status(400).json({ message: 'Invalid authenticator code', error: true, success: false });
        }
        await updateUser(request.userId, { totp_enabled: false, totp_secret: null });
        await logSecurityEvent({
            userId: request.userId,
            action: 'auth.2fa_disabled',
            ip: getClientIp(request),
            userAgent: getUserAgent(request),
            success: true,
            details: {},
        }).catch(() => {});
        return response.json({
            message: 'Two-factor authentication disabled',
            error: false,
            success: true,
            data: { totpEnabled: false },
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

export async function verifyTwoFactorLoginController(request, response) {
    const endLogin = authLoginDuration.startTimer();
    let outcome;
    try {
        const { id: userId, emailOtpHash } = verifyTwoFactorTempToken(request.body?.tempToken);
        const user = await findUserById(userId);
        if (!user || user.status !== 'Active' || !user.totp_enabled) {
            outcome = 'failure';
            return response.status(400).json({ message: 'Invalid or expired 2FA session', error: true, success: false });
        }
        const code = String(request.body?.code || '').trim();
        const totpOk = verifyTotpCode(user.totp_secret, code);
        const emailOtpOk =
            Boolean(emailOtpHash) &&
            timingSafeEqualStr(emailOtpHash, hashTwoFactorEmailOtp(code));
        if (!totpOk && !emailOtpOk) {
            await recordLoginFailure(user.id, request);
            outcome = 'failure';
            biz.loginFailed();
            return response.status(400).json({ message: 'Invalid authenticator code', error: true, success: false });
        }
        const { csrfToken } = await issueAuthCookies(response, user.id, request);
        const publicUser = await findUserPublicById(user.id);
        authLoginAttempts.inc({ outcome: 'success' });
        biz.loginSuccess();
        outcome = 'success';
        return response.json({
            message: 'Login successfully',
            error: false,
            success: true,
            data: { csrfToken, user: publicUser },
        });
    } catch (error) {
        outcome = 'error';
        return response.status(400).json({
            message: error.message || 'Invalid or expired 2FA session',
            error: true,
            success: false,
        });
    } finally {
        endLogin({ outcome: outcome || 'error' });
    }
}

export async function getPublicProfileController(request, response) {
    try {
        const id = pickId(request.params.id);
        if (!id) {
            return response.status(400).json({ message: 'Invalid profile id', error: true, success: false });
        }
        const user = await findUserPublicById(id);
        if (!user || user.status !== 'Active') {
            return response.status(404).json({ message: 'Profile not found', error: true, success: false });
        }
        const prefs = normalizeNotificationPrefs(user.notification_prefs);
        if (!prefs.publicProfile) {
            return response.status(404).json({ message: 'This profile is private', error: true, success: false });
        }
        const reviews = await findReviewsByUser(user.id, { limit: 30 });
        return response.json({
            message: 'Public profile',
            error: false,
            success: true,
            data: {
                id: user.id,
                name: user.name,
                avatar: user.avatar || null,
                bio: user.bio || '',
                memberSince: user.createdAt || user.created_at,
                reviews: reviews.map((r) => ({
                    id: r.id,
                    rating: r.rating,
                    comment: r.comment,
                    productId: r.productId,
                    productName: r.productName,
                    createdAt: r.createdAt,
                })),
            },
        });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
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
            if (!password || !(await comparePassword(password, user.password))) {
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

/** Issue / rotate CSRF for double-submit. Public — no session required (token alone grants nothing). */
export async function getCsrfController(_request, response) {
    try {
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
            if (!password || !(await comparePassword(password, user.password))) {
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
        await updateUser(user.id, { pin_hash: await hashPassword(String(pin).trim()) });
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
        if (!currentPin || !(await comparePassword(String(currentPin).trim(), user.pin_hash))) {
            return response.status(400).json({ message: 'Current PIN is incorrect', error: true, success: false });
        }
        const err = validatePinFormat(pin);
        if (err) {
            return response.status(400).json({ message: err, error: true, success: false });
        }
        if (String(pin) !== String(confirmPin)) {
            return response.status(400).json({ message: 'pin and confirmPin must match', error: true, success: false });
        }
        await updateUser(user.id, { pin_hash: await hashPassword(String(pin).trim()) });
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
            await enqueueEmail({
                sendTo: user.email,
                subject: 'Reset your app PIN',
                html,
            });
        } catch {
            void sendEmail({
                sendTo: user.email,
                subject: 'Reset your app PIN',
                html,
            }).catch(() => {});
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
            pin_hash: await hashPassword(String(newPin).trim()),
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
        if (!(await comparePassword(String(pin).trim(), user.pin_hash))) {
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
        const { csrfToken } = await issueAuthCookies(response, user.id, request);
        const publicUser = await findUserPublicById(user.id);
        return response.json({
            message: 'Login successfully',
            error: false,
            success: true,
            data: { csrfToken, user: publicUser },
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
            if (!password || !(await comparePassword(password, user.password))) {
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
            refresh_token_prev: '',
            refresh_token_prev_until: null,
            pin_hash: null,
            pin_reset_otp: null,
            pin_reset_expiry: null,
        });
        return response.json({ message: 'Account deactivated', error: false, success: true });
    } catch (error) {
        return response.status(500).json({ message: error.message || error, error: true, success: false });
    }
}
