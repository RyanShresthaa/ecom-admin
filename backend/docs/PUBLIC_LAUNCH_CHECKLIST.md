# Public deployment checklist

Do these **in order** before opening the site to real customers.  
Check each box as you finish it.

---

## 1. Get a server and domain

- [ ] Rent a VPS (or PaaS) with Docker installed
- [ ] Buy a domain (example: `yourshop.com`)
- [ ] Create DNS records:
  - [ ] `api.yourshop.com` → server IP
  - [ ] `shop.yourshop.com` → server IP (customer store)
  - [ ] `admin.yourshop.com` → server IP (admin dashboard)

---

## 2. Put secrets on the server (never in git)

On the server, in the `backend` folder:

```bash
mkdir -p secrets
openssl rand -base64 48 | tr -d '\n' > secrets/db_password.txt
openssl rand -base64 48 | tr -d '\n' > secrets/jwt_access.txt
openssl rand -base64 48 | tr -d '\n' > secrets/jwt_refresh.txt
openssl rand -base64 32 | tr -d '\n' > secrets/metrics_token.txt
chmod 600 secrets/*
```

- [ ] Created all four secret files
- [ ] Confirmed they are **not** committed to git

Also set real values for Stripe, SMTP, Cloudinary, Google login (if used) — via host env or a secret manager. See [SECRETS.md](./SECRETS.md).

---

## 3. Set production URLs

Export or put in the server env (must be **https**):

```bash
export CORS_ORIGINS=https://shop.yourshop.com,https://admin.yourshop.com
export CLIENT_URL=https://shop.yourshop.com
export FRONTEND_URL=https://shop.yourshop.com
export API_PUBLIC_ORIGIN=https://api.yourshop.com
```

- [ ] URLs match your real domains
- [ ] Admin/customer build args use the same API URL:
  - Customer: `NEXT_PUBLIC_API_URL=https://api.yourshop.com/api`
  - Admin: `VITE_API_URL=https://api.yourshop.com/api`

---

## 4. Start the API with Docker

On the server:

```bash
cd backend
docker compose -f docker-compose.prod.yml up -d --build
curl -sf http://127.0.0.1:5000/api/health/ready
```

- [ ] Health returns `"ok": true`
- [ ] Port **5000 is only on localhost** (not open to the public internet)
- [ ] Postgres is **not** exposed publicly

---

## 5. Turn on HTTPS (required)

Pick one:

**Caddy (easiest):** use [../deploy/Caddyfile](../deploy/Caddyfile) — replace `yourdomain.com`, then run Caddy.

**nginx:** use [../deploy/nginx.conf.example](../deploy/nginx.conf.example) + Let’s Encrypt (`certbot`).

- [ ] `https://api.yourshop.com/api/health` works in a browser
- [ ] HTTP redirects to HTTPS
- [ ] Cookies work only over HTTPS (`NODE_ENV=production`)

---

## 6. Deploy customer + admin frontends

```bash
# Customer (Next)
docker build -t shop --build-arg NEXT_PUBLIC_API_URL=https://api.yourshop.com/api ./customer
docker run -d -p 127.0.0.1:3000:3000 --name shop shop

# Admin (Vite + nginx)
docker build -t admin --build-arg VITE_API_URL=https://api.yourshop.com/api ./admin-dashboard
docker run -d -p 127.0.0.1:8081:80 --name admin admin
```

Point Caddy/nginx at those ports (see [../deploy/nginx-frontends.conf.example](../deploy/nginx-frontends.conf.example)).

- [ ] `https://shop.yourshop.com` loads the store
- [ ] `https://admin.yourshop.com` loads the admin login
- [ ] Login / cart / admin actions work (not blocked by CORS)

---

## 7. Harden production settings

- [ ] `ALLOW_MOCK_PAYMENT=false` (real Stripe only)
- [ ] `ENABLE_SWAGGER=false` (docs off)
- [ ] Set `METRICS_BEARER_TOKEN` (already in `secrets/metrics_token.txt`)
- [ ] Create a [Sentry](https://sentry.io) project and set `SENTRY_DSN=...`
- [ ] Set `STRICT_PRODUCTION=true` and restart the API
- [ ] `BCRYPT_COST=12` and `UV_THREADPOOL_SIZE=8` are set

---

## 8. Backups (do this before launch day)

- [ ] Prefer managed Postgres with **automatic backups / PITR** (Neon, RDS, etc.), **or** keep Docker Postgres and schedule dumps
- [ ] Offsite copy enabled, e.g. `BACKUP_S3_URI=s3://your-bucket/db-backups`
- [ ] Run one backup and **test restore** on a staging DB:
  - Docker host: `scripts/backup-docker.ps1` (Windows) or `npm run db:backup:offsite` (Linux)
  - Restore: `npm run db:restore -- backups/…`
- [ ] Confirm you know how to restore if the server dies

---

## 9. Smoke test the live site

Do this yourself on the real HTTPS URLs:

- [ ] Register / login as a customer
- [ ] Browse products, add to cart, place a **test** order
- [ ] Pay with Stripe **test mode**, then switch to **live keys** only when ready
- [ ] Admin login works; create/edit/delete a product
- [ ] Email works (order / reset password) — check spam
- [ ] Mobile layout looks OK

---

## 10. Optional but recommended

- [ ] Install GitHub CLI and set deploy secrets (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`) for CD
- [ ] Restrict `/api/docs` if you ever turn Swagger on
- [ ] Uptime monitor on `https://api.yourshop.com/api/health`
- [ ] Prometheus scrape of `/metrics` with Bearer token only

---

## Go / no-go

**Do not announce publicly until all of sections 1–9 are checked.**

If anything fails, fix it before marketing the URL.

### Quick “am I ready?” test

```text
https://api.yourshop.com/api/health/ready   → ok: true
https://shop.yourshop.com                   → store loads over HTTPS
https://admin.yourshop.com                  → admin loads over HTTPS
Backup restored successfully on a test DB
STRICT_PRODUCTION=true and API still starts
```

More detail: [DEPLOYMENT.md](./DEPLOYMENT.md) · [SECRETS.md](./SECRETS.md) · [MONITORING.md](./MONITORING.md)
