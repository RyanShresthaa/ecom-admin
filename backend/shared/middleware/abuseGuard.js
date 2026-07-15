/**
 * Failed login counters + optional account lockout (`users.locked_until`).
 * Env: `MAX_LOGIN_FAILURES`, `LOCKOUT_MINUTES`
 */
import pool from '../config/connectDB.js';
import { findUserById } from '../models/user.model.js';
import { logSecurityEvent } from '../models/securityEvent.model.js';
import { getClientIp, getUserAgent } from '../utils/requestMeta.js';

const MAX_FAILURES = Number(process.env.MAX_LOGIN_FAILURES || 5);
const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES || 15);

export async function checkAccountLockout(user) {
    if (!user?.locked_until) return null;
    if (new Date(user.locked_until) > new Date()) {
        return `Account temporarily locked. Try again after ${new Date(user.locked_until).toISOString()}`;
    }
    return null;
}

export async function recordLoginFailure(userId, req) {
    const ip = getClientIp(req);
    const ua = getUserAgent(req);
    await logSecurityEvent({
        userId,
        action: 'auth.login_failed',
        ip,
        userAgent: ua,
        success: false,
        details: {},
    });

    if (!userId) return;

    const r = await pool.query(
        `UPDATE users SET
            failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE
                WHEN failed_login_attempts + 1 >= $2
                THEN NOW() + make_interval(mins => $3)
                ELSE locked_until
            END,
            updated_at = NOW()
         WHERE id = $1
         RETURNING failed_login_attempts, locked_until`,
        [userId, MAX_FAILURES, LOCKOUT_MINUTES],
    );
    const row = r.rows[0];
    if (row?.locked_until && new Date(row.locked_until) > new Date()) {
        await logSecurityEvent({
            userId,
            action: 'auth.account_locked',
            ip,
            userAgent: ua,
            success: false,
            details: { attempts: row.failed_login_attempts },
        });
    }
}

export async function recordLoginSuccess(userId, req) {
    const ip = getClientIp(req);
    const ua = getUserAgent(req);
    await pool.query(
        `UPDATE users SET
            failed_login_attempts = 0,
            locked_until = NULL,
            last_login_ip = $2,
            last_login_user_agent = $3,
            updated_at = NOW()
         WHERE id = $1`,
        [userId, ip, ua],
    );
    await logSecurityEvent({
        userId,
        action: 'auth.login_success',
        ip,
        userAgent: ua,
        success: true,
        details: {},
    });
}

export async function requireUnlockedAccount(req, res, next) {
    if (!req.userId) return next();
    try {
        const user = await findUserById(req.userId);
        const msg = await checkAccountLockout(user);
        if (msg) {
            return res.status(423).json({ message: msg, error: true, success: false });
        }
        next();
    } catch {
        return res.status(500).json({ message: 'Account check failed', error: true, success: false });
    }
}
