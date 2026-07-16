/**
 * MFA challenge + enroll/disable orchestration.
 */
import crypto from 'crypto';
import pool from '../../config/connectDB.js';
import { pickId, mapRow } from '../../utils/sql.js';
import { isEnabled } from '../featureFlags/index.js';
import {
    generateTotpSecret,
    verifyTotpCode,
    otpauthUri,
    generateBackupCodes,
    hashBackupCode,
} from './totp.js';

// Load a user's MFA fields required for challenge/enrollment checks.
export async function getUserMfa(userId) {
    const r = await pool.query(
        `SELECT id, email, mfa_enabled, mfa_totp_secret, mfa_backup_codes FROM users WHERE id = $1`,
        [pickId(userId)],
    );
    return mapRow(r.rows[0]);
}

/** Start enrollment — returns secret + otpauth URI (do not enable until confirm). */
export async function beginMfaEnrollment(userId, email) {
    if (!(await isEnabled('mfa'))) {
        const err = new Error('MFA feature is disabled');
        err.status = 403;
        throw err;
    }
    const secret = generateTotpSecret();
    await pool.query(`UPDATE users SET mfa_totp_secret = $1, updated_at = NOW() WHERE id = $2`, [
        secret,
        pickId(userId),
    ]);
    return {
        secret,
        otpauthUrl: otpauthUri({ secret, email }),
    };
}

/** Confirm first TOTP code → enable MFA + issue backup codes. */
export async function confirmMfaEnrollment(userId, code) {
    const user = await getUserMfa(userId);
    if (!user?.mfa_totp_secret) {
        const err = new Error('Start MFA enrollment first');
        err.status = 400;
        throw err;
    }
    if (!verifyTotpCode(user.mfa_totp_secret, code)) {
        const err = new Error('Invalid authenticator code');
        err.status = 400;
        throw err;
    }
    const backup = generateBackupCodes(8);
    const hashed = backup.map(hashBackupCode);
    await pool.query(
        `UPDATE users SET mfa_enabled = true, mfa_backup_codes = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(hashed), pickId(userId)],
    );
    return { enabled: true, backupCodes: backup };
}

export async function disableMfa(userId, code) {
    const user = await getUserMfa(userId);
    if (!user?.mfa_enabled) return { enabled: false };
    const backupList = consumeBackupCodeSync(user, code);
    const ok = verifyTotpCode(user.mfa_totp_secret, code) || backupList != null;
    if (!ok) {
        const err = new Error('Invalid authenticator or backup code');
        err.status = 400;
        throw err;
    }
    if (backupList) await persistBackupCodes(userId, backupList);
    await pool.query(
        `UPDATE users SET mfa_enabled = false, mfa_totp_secret = NULL, mfa_backup_codes = '[]'::jsonb, updated_at = NOW()
         WHERE id = $1`,
        [pickId(userId)],
    );
    return { enabled: false };
}

// Consume one backup code and return remaining hashes.
function consumeBackupCodeSync(user, code) {
    const hashed = hashBackupCode(code);
    const list = Array.isArray(user.mfa_backup_codes) ? [...user.mfa_backup_codes] : [];
    const idx = list.indexOf(hashed);
    if (idx < 0) return null;
    list.splice(idx, 1);
    return list;
}

// Persist backup-code hash list after one-time-code usage.
async function persistBackupCodes(userId, list) {
    await pool.query(`UPDATE users SET mfa_backup_codes = $1::jsonb WHERE id = $2`, [
        JSON.stringify(list),
        pickId(userId),
    ]);
}

/** After password check — create short-lived challenge instead of issuing tokens. */
export async function createMfaChallenge(userId) {
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    await pool.query(
        `INSERT INTO mfa_challenges (user_id, challenge_token, expires_at) VALUES ($1, $2, $3)`,
        [pickId(userId), token, expires],
    );
    return { challengeToken: token, expiresAt: expires.toISOString() };
}

export async function verifyMfaChallenge(challengeToken, code) {
    const r = await pool.query(
        `SELECT * FROM mfa_challenges WHERE challenge_token = $1 AND consumed_at IS NULL AND expires_at > NOW()`,
        [String(challengeToken || '')],
    );
    const row = r.rows[0];
    if (!row) {
        const err = new Error('Invalid or expired MFA challenge');
        err.status = 400;
        throw err;
    }
    const user = await getUserMfa(row.user_id);
    if (!user?.mfa_enabled) {
        const err = new Error('MFA is not enabled for this user');
        err.status = 400;
        throw err;
    }
    const backupList = consumeBackupCodeSync(user, code);
    const ok = verifyTotpCode(user.mfa_totp_secret, code) || backupList != null;
    if (!ok) {
        const err = new Error('Invalid authenticator code');
        err.status = 400;
        throw err;
    }
    if (backupList) await persistBackupCodes(row.user_id, backupList);
    await pool.query(`UPDATE mfa_challenges SET consumed_at = NOW() WHERE id = $1`, [row.id]);
    return { userId: row.user_id };
}

// Decide whether login should branch into MFA challenge flow.
export async function shouldRequireMfa(user) {
    if (!(await isEnabled('mfa'))) return false;
    return Boolean(user?.mfa_enabled);
}
