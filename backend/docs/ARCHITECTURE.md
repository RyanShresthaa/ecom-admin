# Architecture & documentation map

## Swagger / OpenAPI

| Location | Purpose |
|----------|---------|
| [http://localhost:5000/api/docs](http://localhost:5000/api/docs) | Interactive Swagger UI |
| [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json) | Raw OpenAPI JSON |
| `config/swaggerDefinition.js` | Shared schemas, tags, security |
| `config/swagger.js` | Merges spec via swagger-jsdoc |
| `docs/openapi/*.paths.js` | Path definitions by domain (chat, blog, sales, purchases, scale, …) |
| `routes/*.js` | HTTP wiring; headers link to Swagger tags |

When you add a route:

1. Register handler in `routes/<name>.route.js`
2. Add `@openapi` block in matching `docs/openapi/*.paths.js`
3. Implement logic in `controllers/` → `models/`
4. For **Nepal purchase VAT**, see `utils/nepalVat.js`, `011_nepal_purchase_vat.sql`, `/api/purchases`.

## Production (item 5)

| File | Purpose |
|------|---------|
| `docs/DEPLOYMENT.md` | HTTPS, DB, backups, monitoring checklist |
| `Dockerfile` | Container image |
| `docker-compose.yml` | API + Postgres + email worker |
| `deploy/nginx.conf.example` | TLS reverse proxy |
| `.env.production.example` | Production env template |
| `config/production.js` | Startup warnings |

## Layer diagram

```
Client → server.js (middleware) → routes → controllers → models → PostgreSQL
                              ↘ utils (checkout, pricing, email queue)
```
