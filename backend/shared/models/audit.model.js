// audit model: handles audit table/entity CRUD and query helpers.
/**
 * PostgreSQL: `audit_logs` — admin actions (also emits security event where used).
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';
import { logSecurityEvent } from './securityEvent.model.js';

// audit model: logAudit creates a new record.
export async function logAudit({ adminId, action, entityType, entityId, details, ip, userAgent }) {
    const r = await pool.query(
        `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
        [adminId, action, entityType || '', entityId ?? null, JSON.stringify(details || {})],
    );
    await logSecurityEvent({
        userId: adminId,
        action: `admin.${action}`,
        ip,
        userAgent,
        success: true,
        details: { entityType, entityId, ...(details || {}) },
    }).catch(() => {});
    return mapRow(r.rows[0]);
}

// audit model: findAuditLogs reads and returns records.
export async function findAuditLogs({ limit = 50, skip = 0 }) {
    const r = await pool.query(
        `SELECT a.*, u.name AS admin_name FROM audit_logs a
         LEFT JOIN users u ON u.id = a.admin_id
         ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, skip],
    );
    return r.rows.map((row) => ({ ...mapRow(row), adminName: row.admin_name }));
}

