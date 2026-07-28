/**
 * Long-lived refresh JWT persisted on user row; secret/TTL from config/security.js.
 * Includes unique `jti` so rotations within the same second are distinct (replay detection).
 * On rotate, previous token is kept briefly (`REFRESH_ROTATION_GRACE_MS`) for multi-tab races.
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../config/connectDB.js';
import { updateUser } from '../models/user.model.js';
import { getRefreshSecret, getRefreshTokenExpiresIn } from '../config/security.js';

function graceSeconds() {
    const ms = Number(process.env.REFRESH_ROTATION_GRACE_MS || 30_000);
    if (!Number.isFinite(ms) || ms <= 0) return 0;
    return Math.max(1, Math.ceil(ms / 1000));
}

const generateRefreshToken = async (userId, { previousToken = null } = {}) => {
    const token = jwt.sign(
        { id: userId, jti: crypto.randomBytes(16).toString('hex') },
        getRefreshSecret(),
        {
            expiresIn: getRefreshTokenExpiresIn(),
            algorithm: 'HS256',
        },
    );

    const grace = graceSeconds();
    if (previousToken && grace > 0) {
        const r = await pool.query(
            `UPDATE users SET
                refresh_token_prev = $2,
                refresh_token_prev_until = NOW() + make_interval(secs => $3),
                refresh_token = $4,
                updated_at = NOW()
             WHERE id = $1 AND refresh_token = $2
             RETURNING id`,
            [userId, String(previousToken), grace, token],
        );
        // Concurrent rotator already moved the token — keep winner's token; caller should re-read
        if (!r.rowCount) {
            const lost = new Error('refresh_token_concurrent_rotation');
            lost.code = 'REFRESH_CONCURRENT';
            throw lost;
        }
    } else {
        await updateUser(userId, {
            refresh_token: token,
            refresh_token_prev: '',
            refresh_token_prev_until: null,
        });
    }

    return token;
};

export default generateRefreshToken;

