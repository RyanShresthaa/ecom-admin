import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { verifySmtp } from '../shared/config/sendEmail.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

try {
    const result = await verifySmtp();
    if (!result.ok) {
        console.error('SMTP failed:', result.reason);
        process.exit(1);
    }
    console.log('SMTP verify: OK');
} catch (e) {
    console.error('SMTP verify failed:', e.message);
    process.exit(1);
}
