/**
 * Optional reCAPTCHA on routes that mount `verifyCaptcha` (skipped if secret unset).
 */

/**
 * Optional Google reCAPTCHA v2/v3 verification.
 * Set RECAPTCHA_SECRET_KEY in .env to enforce on protected routes.
 *
 * Disabled for now — re-enable by uncommenting the block below and removing the no-op.
 */
export async function verifyCaptcha(_req, _res, next) {
    // No-op captcha gate: currently bypasses verification on all routes.
    return next();
}

// import { logger } from '../utils/logger.js';
//
// export async function verifyCaptcha(req, res, next) {
//     const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
//     if (!secret) return next();
//
//     const token = req.body?.captchaToken || req.body?.recaptchaToken;
//     if (!token) {
//         return res.status(400).json({
//             message: 'captchaToken is required',
//             error: true,
//             success: false,
//         });
//     }
//
//     try {
//         const params = new URLSearchParams({ secret, response: token });
//         const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//             body: params,
//         });
//         const data = await r.json();
//         if (!data.success) {
//             return res.status(400).json({
//                 message: 'Captcha verification failed',
//                 error: true,
//                 success: false,
//             });
//         }
//         if (process.env.RECAPTCHA_MIN_SCORE && data.score != null) {
//             if (Number(data.score) < Number(process.env.RECAPTCHA_MIN_SCORE)) {
//                 return res.status(400).json({
//                     message: 'Captcha score too low',
//                     error: true,
//                     success: false,
//                 });
//             }
//         }
//         next();
//     } catch (err) {
//         logger.error('Captcha verify error', err.message);
//         return res.status(503).json({
//             message: 'Captcha service unavailable',
//             error: true,
//             success: false,
//         });
//     }
// }
