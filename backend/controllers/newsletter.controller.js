/**
 * Newsletter subscribe (public) + admin list/export.
 */
import pool from '../config/connectDB.js';
import { mapRow } from '../utils/sql.js';
import { biz } from '../config/businessMetrics.js';

export async function subscribeNewsletterController(req, res) {
    try {
        const email = String(req.body?.email || '')
            .trim()
            .toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            biz.newsletterFail();
            return res.status(400).json({ message: 'Valid email required', error: true, success: false });
        }
        const source = String(req.body?.source || 'footer').slice(0, 50);
        await pool.query(
            `INSERT INTO newsletter_subscribers (email, source, active)
             VALUES ($1, $2, true)
             ON CONFLICT (email) DO UPDATE SET
               active = true,
               updated_at = NOW(),
               source = EXCLUDED.source`,
            [email, source],
        );
        biz.newsletterOk();
        return res.json({
            message: 'Thanks for subscribing!',
            error: false,
            success: true,
        });
    } catch (e) {
        biz.newsletterFail();
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function listNewsletterSubscribersController(req, res) {
    try {
        const limit = Math.min(5000, Math.max(1, Number(req.query.limit) || 500));
        const activeOnly = String(req.query.active || 'true') !== 'false';
        const r = await pool.query(
            `SELECT id, email, source, active, created_at, updated_at
             FROM newsletter_subscribers
             ${activeOnly ? 'WHERE active = true' : ''}
             ORDER BY created_at DESC
             LIMIT $1`,
            [limit],
        );
        const data = r.rows.map((row) => ({
            ...mapRow(row),
            email: row.email,
            source: row.source,
            active: row.active,
        }));
        return res.json({ data, error: false, success: true });
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}

export async function exportNewsletterSubscribersController(req, res) {
    try {
        const activeOnly = String(req.query.active || 'true') !== 'false';
        const r = await pool.query(
            `SELECT email, source, active, created_at
             FROM newsletter_subscribers
             ${activeOnly ? 'WHERE active = true' : ''}
             ORDER BY created_at DESC`,
        );
        const header = 'email,source,active,created_at\n';
        const lines = r.rows.map((row) => {
            const email = `"${String(row.email).replace(/"/g, '""')}"`;
            const source = `"${String(row.source || '').replace(/"/g, '""')}"`;
            return `${email},${source},${row.active ? 'true' : 'false'},${row.created_at?.toISOString?.() || row.created_at}`;
        });
        const csv = header + lines.join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"');
        return res.status(200).send(csv);
    } catch (e) {
        return res.status(500).json({ message: e.message, error: true, success: false });
    }
}
