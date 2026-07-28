/**
 * Load Docker Compose secrets (*_FILE) into process.env.
 * Maps FOO_FILE → FOO. Safe when no *_FILE vars are set.
 * Must be imported (or run in the same process) before DB/JWT use.
 */
import fs from 'fs';

export function loadDockerSecrets() {
    const suffixes = Object.keys(process.env).filter((k) => k.endsWith('_FILE'));
    for (const fileKey of suffixes) {
        const target = fileKey.slice(0, -'_FILE'.length);
        const path = process.env[fileKey];
        if (!path || process.env[target]) continue;
        try {
            process.env[target] = fs.readFileSync(path, 'utf8').trim();
        } catch (err) {
            console.error(`[secrets] Failed to read ${fileKey}=${path}:`, err.message);
            process.exit(1);
        }
    }
}

loadDockerSecrets();
