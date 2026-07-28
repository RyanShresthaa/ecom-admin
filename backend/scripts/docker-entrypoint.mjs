/**
 * Docker entrypoint: load *_FILE secrets into env, migrate, then start the API.
 * Usage: node scripts/docker-entrypoint.mjs
 */
import { spawnSync } from 'child_process';
import { loadDockerSecrets } from './load-docker-secrets.mjs';

loadDockerSecrets();

function run(cmd, args) {
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        env: process.env,
    });
    if (result.error) {
        console.error(result.error);
        process.exit(1);
    }
    if (result.status !== 0) process.exit(result.status ?? 1);
}

run('node', ['scripts/migrate.mjs']);
run('node', ['server.js']);
