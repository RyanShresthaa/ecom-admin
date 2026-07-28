/**
 * Kubernetes-style probes + detailed health.
 * - GET /api/health/live  — process up (no dependency checks)
 * - GET /api/health/ready — PostgreSQL reachable
 * - GET /api/health       — detailed status (ready-coupled for uptime monitors)
 */
import os from 'os';
import pool from './connectDB.js';
import { dbQueryDuration } from './metrics.js';

function baseMeta() {
    const mem = process.memoryUsage();
    return {
        uptimeSec: Math.floor(process.uptime()),
        memory: {
            rssMb: Math.round(mem.rss / 1024 / 1024),
            heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        },
        host: os.hostname(),
        env: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        pid: process.pid,
    };
}

async function pingDatabase(operation) {
    const end = dbQueryDuration.startTimer({ operation });
    const t0 = Date.now();
    try {
        await pool.query('SELECT 1');
        return { ok: true, dbLatencyMs: Date.now() - t0 };
    } catch {
        return { ok: false, dbLatencyMs: null };
    } finally {
        end();
    }
}

/** Liveness: process is running and event loop is responsive */
export async function livenessHandler(_req, res) {
    res.status(200).json({
        ok: true,
        status: 'alive',
        check: 'liveness',
        ...baseMeta(),
    });
}

/** Readiness: can serve traffic (DB up) */
export async function readinessHandler(_req, res) {
    const started = Date.now();
    const { ok, dbLatencyMs } = await pingDatabase('readiness_ping');
    res.status(ok ? 200 : 503).json({
        ok,
        status: ok ? 'ready' : 'not_ready',
        check: 'readiness',
        database: ok ? 'postgresql' : 'down',
        dbLatencyMs,
        responseMs: Date.now() - started,
        ...baseMeta(),
    });
}

/** Combined detailed health (backward compatible with existing /api/health consumers) */
export async function healthHandler(_req, res) {
    const started = Date.now();
    const { ok, dbLatencyMs } = await pingDatabase('health_ping');
    res.status(ok ? 200 : 503).json({
        ok,
        status: ok ? 'ready' : 'not_ready',
        check: 'health',
        database: ok ? 'postgresql' : 'down',
        dbLatencyMs,
        responseMs: Date.now() - started,
        probes: {
            liveness: '/api/health/live',
            readiness: '/api/health/ready',
            metrics: '/metrics',
        },
        ...baseMeta(),
    });
}
