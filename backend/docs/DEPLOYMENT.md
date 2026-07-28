# Deployment guide

How to run the stack **in production**: HTTPS, secrets, DB, backups, monitoring, containers, PM2, CD.

## Quick start (Docker Compose + secrets)

```bash
cd backend
mkdir -p secrets
openssl rand -base64 48 | tr -d '\n' > secrets/db_password.txt
openssl rand -base64 48 | tr -d '\n' > secrets/jwt_access.txt
openssl rand -base64 48 | tr -d '\n' > secrets/jwt_refresh.txt
openssl rand -base64 32 | tr -d '\n' > secrets/metrics_token.txt
chmod 600 secrets/*
# set CORS_ORIGINS / CLIENT_URL / API_PUBLIC_ORIGIN in shell or .env
docker compose -f docker-compose.prod.yml up -d --build
```

Local prod-like (weaker): `cp .env.example .env && docker compose up --build` (API on `http://127.0.0.1:5001` so host `:5000` stays free for `npm run dev`)

See **[SECRETS.md](./SECRETS.md)** for secret managers and rotation.

## Manual production checklist

### 1. HTTPS (required)

| Option | Config |
|--------|--------|
| nginx | [deploy/nginx.conf.example](../deploy/nginx.conf.example) + [nginx-frontends.conf.example](../deploy/nginx-frontends.conf.example) |
| Caddy (auto TLS) | [deploy/Caddyfile](../deploy/Caddyfile) |

- Bind API to `127.0.0.1:5000` only (see `docker-compose.prod.yml`)
- Set `TRUST_PROXY_HOPS=1`, `NODE_ENV=production`, `API_PUBLIC_ORIGIN=https://api…`

### 2. Managed PostgreSQL

- Neon / Supabase / RDS / Railway
- `DB_SSL=require`, tune `DB_POOL_MAX`
- Enable provider **PITR / automated backups**
- `npm run db:migrate` per release

### 3. Backups

```bash
npm run db:backup              # local backups/*.dump
npm run db:backup:offsite      # + aws s3 cp when BACKUP_S3_URI set
npm run db:restore -- backups/…  # test on staging
```

Systemd timer: [deploy/systemd/db-backup.timer](../deploy/systemd/db-backup.timer)

### 4. Process manager (PM2)

```bash
npm ci --omit=dev && npm run db:migrate && npm run pm2:start
pm2 save && pm2 startup
```

Config: [ecosystem.config.cjs](../ecosystem.config.cjs)

### 5. Frontends

| App | Image | Cache |
|-----|-------|-------|
| Customer | `customer/Dockerfile` (Next standalone) | `/_next/static` immutable |
| Admin | `admin-dashboard/Dockerfile` (nginx) | `/assets` immutable |

```bash
docker build -t shop --build-arg NEXT_PUBLIC_API_URL=https://api… ./customer
docker build -t admin --build-arg VITE_API_URL=https://api…/api ./admin-dashboard
```

### 6. Monitoring

| Probe | URL |
|-------|-----|
| Live | `GET /api/health/live` |
| Ready | `GET /api/health/ready` |
| Metrics | `GET /metrics` + `Authorization: Bearer $METRICS_BEARER_TOKEN` |

Swagger is **off** in production (`ENABLE_SWAGGER=false`). Details: [MONITORING.md](./MONITORING.md).

### 7. Environment

Template: [.env.production.example](../.env.production.example)

| Variable | Production |
|----------|------------|
| `STRICT_PRODUCTION` | `true` |
| `ENABLE_SWAGGER` | `false` |
| `METRICS_BEARER_TOKEN` | required |
| `ALLOW_MOCK_PAYMENT` | `false` |
| `DB_SSL` | `require` (managed DB) |
| `UV_THREADPOOL_SIZE` | `8` before Node starts |

## CI/CD

| Workflow | Role |
|----------|------|
| `.github/workflows/backend-ci.yml` | Lint, migrate, tests |
| `.github/workflows/backend-cd.yml` | Build/push GHCR + Trivy; optional SSH deploy |
| `.github/workflows/customer-ci.yml` | Lint + build storefront |
| `.github/workflows/admin-ci.yml` | Lint + build admin |
| `.github/dependabot.yml` | Weekly npm/Actions/Docker updates |

CD deploy needs GitHub Environment `production` secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, optional `DEPLOY_PATH`.

## Process layout

```
Internet → Caddy/nginx (TLS) → api :5000 (localhost)
                           ↘ shop :3000 / admin :80
API → pooled PostgreSQL
    ↘ email-worker
cron/systemd → db:backup:offsite → S3
```

Graceful shutdown: SIGTERM → drain HTTP → `pool.end()` (`SHUTDOWN_TIMEOUT_MS` default 15s).

## Related

- [SECRETS.md](./SECRETS.md) — secret stores
- [MONITORING.md](./MONITORING.md) — probes & metrics
- [ARCHITECTURE.md](./ARCHITECTURE.md) — code map
