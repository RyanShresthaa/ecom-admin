/**
 * Email worker entrypoint with Docker secret loading.
 */
import { loadDockerSecrets } from './load-docker-secrets.mjs';
import { spawnSync } from 'child_process';

loadDockerSecrets();
const result = spawnSync('node', ['scripts/email-worker.mjs'], {
    stdio: 'inherit',
    env: process.env,
});
process.exit(result.status ?? 1);
