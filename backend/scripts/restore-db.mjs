/**
 * Restore a pg_dump custom-format backup created by npm run db:backup.
 *
 * Usage: npm run db:restore -- backups/backup-<db>-<stamp>.dump
 * WARNING: overwrites objects in the target database — use a staging DB when testing.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });

const dumpPath = process.argv[2];
if (!dumpPath) {
    console.error('[restore] Usage: npm run db:restore -- backups/backup-....dump');
    process.exit(1);
}

const resolved = path.isAbsolute(dumpPath) ? dumpPath : path.join(root, dumpPath);
if (!fs.existsSync(resolved)) {
    console.error('[restore] File not found:', resolved);
    process.exit(1);
}

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
if (!DB_NAME || !DB_USER) {
    console.error('[restore] Set DB_NAME and DB_USER in .env');
    process.exit(1);
}

const env = { ...process.env, PGPASSWORD: DB_PASSWORD || '' };
const cmd = [
    'pg_restore',
    `--host=${DB_HOST || 'localhost'}`,
    `--port=${DB_PORT || 5432}`,
    `--username=${DB_USER}`,
    `--dbname=${DB_NAME}`,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-acl',
    `"${resolved}"`,
].join(' ');

console.log('[restore] Restoring into', DB_NAME, 'from', resolved);
execSync(cmd, { env, stdio: 'inherit' });
console.log('[restore] Done. Run migrations if schema drifted: npm run db:migrate');
