// emailQueue model: handles emailQueue table/entity CRUD and query helpers.
/**
 * PostgreSQL: `email_queue` — outbound mail when `EMAIL_USE_QUEUE=true`.
 */
import pool from '../config/connectDB.js';

// emailQueue model: enqueueEmail creates a new record.
export async function enqueueEmail({ sendTo, subject, html, text }) {
    const r = await pool.query(
        `INSERT INTO email_queue (send_to, subject, html, text, status)
         VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
        [sendTo, subject, html || null, text || null],
    );
    return r.rows[0].id;
}

// emailQueue model: fetchPendingEmails reads and returns records.
export async function fetchPendingEmails(limit = 20) {
    const r = await pool.query(
        `SELECT id, send_to, subject, html, text, attempts
         FROM email_queue
         WHERE status = 'pending' AND attempts < 5
         ORDER BY created_at ASC
         LIMIT $1`,
        [limit],
    );
    return r.rows;
}

// emailQueue model: markEmailSent updates existing records.
export async function markEmailSent(id) {
    await pool.query(
        `UPDATE email_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [id],
    );
}

// emailQueue model: markEmailFailed updates existing records.
export async function markEmailFailed(id, errorMessage) {
    await pool.query(
        `UPDATE email_queue
         SET attempts = attempts + 1, last_error = $2,
             status = CASE WHEN attempts + 1 >= 5 THEN 'failed' ELSE 'pending' END
         WHERE id = $1`,
        [id, errorMessage?.slice(0, 500) || 'unknown'],
    );
}

