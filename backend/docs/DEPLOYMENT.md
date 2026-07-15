# Deployment guide (item 5)

How to run app **in production** safely: HTTPS, database, backups, monitoring, containers.

## Quick start with Docker

```bash
cd backend
cp .env.example .env          # edit secrets
docker compose up --build
```

Services:

| Service | Port | Role |
|---------|------|------|
| `api` | 5000 | REST API |
| `db` | 5432 | PostgreSQL 16 |
| `email-worker` | — | Drains `email_queue` |

API runs migrations on start. Set strong JWT secrets in `.env`.

## Manual production checklist

### 1. HTTPS (required for public sites)

- Terminate TLS at **nginx**, **Caddy**, **Cloudflare**, or your PaaS
- Example config: [deploy/nginx.conf.example](../deploy/nginx.conf.example)
- Set `TRUST_PROXY_HOPS=1` (or hops count) so Express trusts `X-Forwarded-Proto`
- Set `NODE_ENV=production` (enables secure cookies)

Without HTTPS, session cookies are not safe on the internet.

### 2. Managed PostgreSQL

- Use Neon, Supabase, Railway, RDS, etc.
- Copy credentials into host secrets (not git)
- Run once per release: `npm run db:migrate`
- Enable provider **automated backups**

### 3. Backups

```bash
npm run db:backup
```

- Schedules: daily cron on server or provider snapshots
- Copy `.sql` files off-server (S3, another region)
- **Test restore** before you need it

### 4. Monitoring & alerts

| Tool | Env | Purpose |
|------|-----|---------|
| Health URL | — | `GET /api/health` every 1–5 min |
| Sentry | `SENTRY_DSN` | Error tracking |
| Logs | host | JSON logs from `utils/logger.js` |

Alert when: health non-200, error spike, disk full.

### 5. Environment file

Template: [.env.production.example](../.env.production.example)

| Variable | Production |
|----------|------------|
| `ALLOW_MOCK_PAYMENT` | `false` |
| `EMAIL_USE_QUEUE` | `true` + run worker |
| `CORS_ORIGINS` | Your frontend URL only |
| `STRICT_PRODUCTION` | `true` to fail boot on warnings |

Startup warnings: `config/production.js`

## Process layout

```
[Internet] → HTTPS proxy → Node (server.js) :5000
                              ↘ PostgreSQL
                         email-worker (optional)
```

## CI/CD

GitHub Actions: [`.github/workflows/backend-ci.yml`](../../.github/workflows/backend-ci.yml)

Deploy after CI passes: build Docker image or `git pull && npm ci && npm run db:migrate && pm2 restart api`.

## Swagger in production

Docs are available at `/api/docs`. For public APIs, restrict with nginx `allow`/`deny` or disable in production if preferred.

## Related docs

- [README.md](./README.md) — API usage
- [ARCHITECTURE.md](./ARCHITECTURE.md) — code map & OpenAPI locations
