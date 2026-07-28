# Secret management

Never commit real credentials. Prefer (in order):

1. **Cloud secret manager** — AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, Doppler, Infisical
2. **Platform secrets** — GitHub Actions Environments, Railway/Render/Fly secrets, Vercel env
3. **Docker secrets** — [docker-compose.prod.yml](../docker-compose.prod.yml) + `scripts/load-docker-secrets.mjs`
4. **Host files** — `/etc/app/backend.env` mode `600`, owned by deploy user (last resort)

## Docker secrets (VPS)

```bash
cd backend
mkdir -p secrets
openssl rand -base64 48 > secrets/db_password.txt
openssl rand -base64 48 > secrets/jwt_access.txt
openssl rand -base64 48 > secrets/jwt_refresh.txt
openssl rand -base64 32 > secrets/metrics_token.txt
chmod 600 secrets/*
docker compose -f docker-compose.prod.yml up -d --build
```

`FOO_FILE` env vars are loaded into `FOO` by `scripts/load-docker-secrets.mjs` before migrate/server.

## GitHub CD deploy secrets

| Secret | Purpose |
|--------|---------|
| `DEPLOY_HOST` | SSH host |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private key |
| `DEPLOY_PATH` | Optional path (default `/opt/app/backend`) |

Create a GitHub **Environment** named `production` with required reviewers for the CD deploy job.

## Rotation

Rotate JWT secrets only with a planned logout of all sessions. Rotate Stripe/SMTP/Cloudinary independently. After rotation, `pm2 reload` or recreate containers.
