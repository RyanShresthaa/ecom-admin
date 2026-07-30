import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { default: pool } = await import('../config/connectDB.js');
const { processEmailBatch } = await import('../utils/emailQueue.js');

const byStatus = await pool.query(
  `SELECT status, COUNT(*)::int AS n FROM email_queue GROUP BY status ORDER BY status`,
);
console.log('queue by status:', byStatus.rows);

const latest = await pool.query(
  `SELECT id, send_to, subject, status, attempts, last_error, created_at
   FROM email_queue
   ORDER BY created_at DESC
   LIMIT 20`,
);
console.log('latest:');
for (const row of latest.rows) {
  console.log(
    `#${row.id}`,
    row.status,
    row.send_to,
    `| ${row.subject}`,
    `attempts=${row.attempts}`,
    row.last_error || '',
  );
}

const pending = Number(byStatus.rows.find((r) => r.status === 'pending')?.n || 0);
if (pending > 0) {
  console.log(`Draining ${pending} pending...`);
  console.log(await processEmailBatch(Math.min(pending, 50)));
}

await pool.end();
