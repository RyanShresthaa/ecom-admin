// securityEvent model: handles securityEvent table/entity CRUD and query helpers.
/**
 * PostgreSQL: `security_events` — auth failures, CSRF blocks, etc.
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';

// securityEvent model: logSecurityEvent creates a new record.
export async function logSecurityEvent({ userId, action, ip, userAgent, success = true, details = {} }) {
    const r = await pool.query(
        `INSERT INTO security_events (user_id, action, ip, user_agent, success, details)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *`,
        [userId ?? null, action, ip || null, userAgent || null, success, JSON.stringify(details)],
    );
    return mapRow(r.rows[0]);
}

// securityEvent model: findSecurityEvents reads and returns records.
export async function findSecurityEvents({ limit = 100, skip = 0, userId, action } = {}) {
    const params = [];
    let where = 'WHERE 1=1';
    if (userId) {
        params.push(userId);
        where += ` AND user_id = $${params.length}`;
    }
    if (action) {
        params.push(action);
        where += ` AND action = $${params.length}`;
    }
    params.push(limit, skip);
    const r = await pool.query(
        `SELECT s.*, u.email AS user_email FROM security_events s
         LEFT JOIN users u ON u.id = s.user_id
         ${where} ORDER BY s.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
    );
    return r.rows.map((row) => ({
        ...mapRow(row),
        userEmail: row.user_email,
    }));
}

