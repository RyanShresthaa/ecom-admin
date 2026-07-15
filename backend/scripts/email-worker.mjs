/**
 * Drain email_queue. Run alongside the API:
 *   npm run email:worker
 * Set EMAIL_USE_QUEUE=true in .env so API enqueues instead of sending inline.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { processEmailBatch } = await import('../shared/utils/emailQueue.js');

const intervalMs = Number(process.env.EMAIL_WORKER_INTERVAL_MS || 5000);
const batchSize = Number(process.env.EMAIL_WORKER_BATCH_SIZE || 20);

console.log(`Email worker started (every ${intervalMs}ms, batch ${batchSize})`);

async function tick() {
    try {
        const r = await processEmailBatch(batchSize);
        if (r.processed > 0) {
            console.log(`Processed ${r.processed} emails (sent ${r.sent}, failed ${r.failed})`);
        }
    } catch (e) {
        console.error('Worker tick error:', e.message);
    }
}

await tick();
setInterval(tick, intervalMs);
