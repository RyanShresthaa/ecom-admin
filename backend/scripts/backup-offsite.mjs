#!/usr/bin/env node
/**
 * Run pg_dump backup then optionally upload to S3-compatible storage.
 *
 * Env:
 *   BACKUP_S3_URI=s3://my-bucket/db-backups   (optional — skips upload if unset)
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION  (or instance role)
 *   BACKUP_KEEP_LOCAL=true|false  (default true)
 *
 * Usage: npm run db:backup:offsite
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

console.log('[backup:offsite] Creating local dump...');
execSync('node scripts/backup-db.mjs', { cwd: root, stdio: 'inherit' });

const s3Uri = (process.env.BACKUP_S3_URI || '').trim();
if (!s3Uri) {
    console.log('[backup:offsite] BACKUP_S3_URI unset — local backup only. Set s3://bucket/prefix for offsite copy.');
    process.exit(0);
}

const backupDir = path.join(root, 'backups');
const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith('.dump'))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

if (!files.length) {
    console.error('[backup:offsite] No .dump files found in backups/');
    process.exit(1);
}

const latest = path.join(backupDir, files[0].name);
const dest = `${s3Uri.replace(/\/$/, '')}/${files[0].name}`;

console.log('[backup:offsite] Uploading', latest, '→', dest);
try {
    execSync(`aws s3 cp "${latest}" "${dest}" --only-show-errors`, {
        stdio: 'inherit',
        env: process.env,
    });
} catch {
    console.error('[backup:offsite] aws s3 cp failed — install AWS CLI and configure credentials');
    process.exit(1);
}

if (process.env.BACKUP_KEEP_LOCAL === 'false') {
    fs.unlinkSync(latest);
    console.log('[backup:offsite] Removed local copy');
}

console.log('[backup:offsite] Done');
