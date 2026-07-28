/**
 * Shared PostgreSQL Pool (pg).
 * Env: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD,
 *      DB_POOL_MAX, DB_POOL_MIN, DB_IDLE_TIMEOUT_MS, DB_CONN_TIMEOUT_MS, DB_SSL
 */
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function resolveSsl() {
    const raw = (process.env.DB_SSL || '').toLowerCase();
    if (raw === 'true' || raw === 'require') {
        return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
    }
    if (raw === 'false' || raw === 'disable') return false;
    // Managed Postgres in production usually requires TLS
    if (isProduction && process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== 'db') {
        return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
    }
    return false;
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: Number(process.env.DB_POOL_MAX) || (isProduction ? 20 : 10),
    min: Number(process.env.DB_POOL_MIN) || 0,
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30_000,
    connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS) || 5_000,
    allowExitOnIdle: !isProduction,
    ssl: resolveSsl(),
});

pool.on('error', (err) => {
    // Idle client errors should not crash the process — log and let the pool replace the client
    logger.error('Unexpected idle database client error', { error: err.message });
});

export default pool;
