/**
 * PostgreSQL backup via pg_dump (custom compressed format).
 * Requires pg_dump on PATH. Schedule daily on production (cron / host backup).
 *
 * Usage: npm run db:backup
 * Output: backend/backups/backup-<DB_NAME>-<timestamp>.dump
 * Restore: npm run db:restore -- backups/backup-....dump
 */
import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

if (!DB_NAME || !DB_USER) {
    console.error('[backup] Set DB_NAME and DB_USER in .env');
    process.exit(1);
}

const backupDir = path.join(root, 'backups');
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = path.join(backupDir, `backup-${DB_NAME}-${stamp}.dump`);
const env = { ...process.env, PGPASSWORD: DB_PASSWORD || '' };

const cmd = [
    'pg_dump',
    `-h ${DB_HOST || 'localhost'}`,
    `-p ${DB_PORT || 5432}`,
    `-U ${DB_USER}`,
    `-d ${DB_NAME}`,
    '-Fc',
    `--file="${out}"`,
].join(' ');

console.log('[backup] Starting pg_dump (custom compressed)...');
execSync(cmd, { env, stdio: 'inherit' });
console.log('[backup] Saved:', out);
console.log('[backup] Copy off-server (S3/another region) and test: npm run db:restore --', path.relative(root, out));
