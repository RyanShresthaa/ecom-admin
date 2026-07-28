/**
 * Apply SQL migrations once each (tracked in schema_migrations).
 * Existing databases are baselined for pre-020 files so seed re-runs cannot conflict.
 * Usage: npm run db:migrate
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function resolveSsl() {
    const raw = String(process.env.DB_SSL || '').toLowerCase();
    if (raw === 'true' || raw === 'require') {
        return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
    }
    return false;
}

const pool = new pg.Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: resolveSsl(),
});

await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
`);

const dir = path.join(__dirname, '..', 'db', 'migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const applied = await pool.query(`SELECT filename FROM schema_migrations`);
const done = new Set(applied.rows.map((r) => r.filename));

const usersReg = await pool.query(`SELECT to_regclass('public.users') AS t`);
const existingDb = Boolean(usersReg.rows[0]?.t);

if (done.size === 0 && existingDb) {
    // Avoid re-running seedful migrations (blog slug conflicts, etc.)
    const perfIdx = await pool.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_publish_created' LIMIT 1`,
    );
    const has020 = perfIdx.rowCount > 0;
    console.log('Existing database detected — baselining prior migrations as applied');
    for (const file of files) {
        if (file.startsWith('020_') && !has020) continue;
        if (file < '020_' || (file.startsWith('020_') && has020)) {
            await pool.query(
                `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
                [file],
            );
            done.add(file);
        }
    }
}

let ran = 0;
let skipped = 0;

for (const file of files) {
    if (done.has(file)) {
        console.log(`Skipping ${file} (already applied)`);
        skipped += 1;
        continue;
    }
    console.log(`Running ${file}...`);
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [file]);
        await client.query('COMMIT');
        ran += 1;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Migration failed: ${file}`);
        throw err;
    } finally {
        client.release();
    }
}

await pool.end();
console.log(`Migrations done. applied=${ran} skipped=${skipped}`);
