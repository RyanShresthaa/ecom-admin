/**
 * PostgreSQL backup via pg_dump (item 5 — disaster recovery).
 * Requires pg_dump on PATH. Schedule daily on production (cron / host backup).
 *
 * Usage: npm run db:backup
 * Output: backend/backup-<DB_NAME>-<timestamp>.sql
 */
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

if (!DB_NAME || !DB_USER) {
    console.error('[backup] Set DB_NAME and DB_USER in .env');
    process.exit(1);
}

const out = path.join(__dirname, '..', `backup-${DB_NAME}-${Date.now()}.sql`);
const env = { ...process.env, PGPASSWORD: DB_PASSWORD || '' };

// -Fc = custom compressed format; use .dump extension if you switch format
const cmd = [
    'pg_dump',
    `-h ${DB_HOST || 'localhost'}`,
    `-p ${DB_PORT || 5432}`,
    `-U ${DB_USER}`,
    `-d ${DB_NAME}`,
    `-f "${out}"`,
].join(' ');

console.log('[backup] Starting pg_dump...');
execSync(cmd, { env, stdio: 'inherit' });
console.log('[backup] Saved:', out);
console.log('[backup] Store off-server and test restore periodically.');
