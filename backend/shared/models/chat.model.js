/**
 * PostgreSQL: chat_sessions + chat_messages for storefront chatbot.
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';

function mapMessage(row) {
    if (!row) return null;
    const base = mapRow(row);
    return {
        ...base,
        sessionId: row.session_id,
        providerMessageId: row.provider_message_id ?? null,
        metadata: row.metadata ?? {},
    };
}

function mapSession(row) {
    if (!row) return null;
    const base = mapRow(row);
    return {
        ...base,
        userId: row.user_id ?? null,
        guestToken: row.guest_token ?? null,
        messageCount: row.message_count != null ? Number(row.message_count) : undefined,
    };
}

export async function createChatSession({ userId, guestToken, title, provider = 'stub' }) {
    const r = await pool.query(
        `INSERT INTO chat_sessions (user_id, guest_token, title, provider, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING *`,
        [userId ?? null, guestToken ?? null, String(title || 'New chat').slice(0, 200), provider],
    );
    return mapSession(r.rows[0]);
}

export async function findChatSessionById(sessionId) {
    const r = await pool.query(`SELECT * FROM chat_sessions WHERE id = $1`, [sessionId]);
    return mapSession(r.rows[0]);
}

export async function listChatSessionsByUser(userId, { limit = 30, skip = 0 } = {}) {
    const r = await pool.query(
        `SELECT s.*,
                (SELECT COUNT(*)::int FROM chat_messages m WHERE m.session_id = s.id) AS message_count
         FROM chat_sessions s
         WHERE s.user_id = $1
         ORDER BY s.updated_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, skip],
    );
    return r.rows.map((row) => mapSession(row));
}

export async function listAllChatSessions({ limit = 50, skip = 0, status } = {}) {
    const params = [];
    let where = 'WHERE 1=1';
    if (status) {
        params.push(status);
        where += ` AND s.status = $${params.length}`;
    }
    const lim = params.length + 1;
    const off = params.length + 2;
    params.push(limit, skip);
    const r = await pool.query(
        `SELECT s.*,
                u.name AS user_name,
                u.email AS user_email,
                (SELECT COUNT(*)::int FROM chat_messages m WHERE m.session_id = s.id) AS message_count
         FROM chat_sessions s
         LEFT JOIN users u ON u.id = s.user_id
         ${where}
         ORDER BY s.updated_at DESC
         LIMIT $${lim} OFFSET $${off}`,
        params,
    );
    return r.rows.map((row) => ({
        ...mapSession(row),
        userName: row.user_name || null,
        userEmail: row.user_email || null,
    }));
}

export async function touchChatSession(sessionId) {
    await pool.query(`UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`, [sessionId]);
}

export async function closeChatSession(sessionId) {
    const r = await pool.query(
        `UPDATE chat_sessions SET status = 'closed', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [sessionId],
    );
    return mapSession(r.rows[0]);
}

export async function insertChatMessage({
    sessionId,
    role,
    content,
    provider = 'stub',
    providerMessageId = null,
    metadata = {},
}) {
    const r = await pool.query(
        `INSERT INTO chat_messages (session_id, role, content, provider, provider_message_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`,
        [
            sessionId,
            role,
            String(content || '').slice(0, 8000),
            provider,
            providerMessageId,
            JSON.stringify(metadata || {}),
        ],
    );
    await touchChatSession(sessionId);
    return mapMessage(r.rows[0]);
}

export async function listChatMessages(sessionId, { limit = 50, beforeId } = {}) {
    const params = [sessionId];
    let where = 'WHERE session_id = $1';
    if (beforeId != null) {
        params.push(Number(beforeId));
        where += ` AND id < $${params.length}`;
    }
    const limIdx = params.length + 1;
    params.push(limit);
    const r = await pool.query(
        `SELECT * FROM chat_messages
         ${where}
         ORDER BY created_at ASC
         LIMIT $${limIdx}`,
        params,
    );
    return r.rows.map(mapMessage);
}

export async function getChatHistoryForProvider(sessionId, limit = 20) {
    const r = await pool.query(
        `SELECT role, content FROM chat_messages
         WHERE session_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [sessionId, limit],
    );
    return r.rows.reverse().map((row) => ({ role: row.role, content: row.content }));
}
