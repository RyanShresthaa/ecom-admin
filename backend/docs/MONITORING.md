# Production monitoring

## Probes

| Endpoint | Use | Behavior |
|----------|-----|----------|
| `GET /api/health/live` | Kubernetes **liveness** | 200 if process is up (no DB check) |
| `GET /api/health/ready` | Kubernetes **readiness** / LB | 200 if PostgreSQL `SELECT 1` succeeds; else 503 |
| `GET /api/health` | Uptime monitors (UptimeRobot, Better Stack, Pingdom) | Detailed JSON; 503 if DB down |
| `GET /metrics` | Prometheus scrape | OpenMetrics/Prometheus text |

Example Kubernetes probes:

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Prometheus

Scrape config:

```yaml
scrape_configs:
  - job_name: ecommerce-api
    metrics_path: /metrics
    scheme: http
    static_configs:
      - targets: ['api:5000']
    authorization:
      type: Bearer
      credentials: '<METRICS_BEARER_TOKEN>'
```

Import Grafana dashboard: [`ops/grafana/api-dashboard.json`](../ops/grafana/api-dashboard.json).  
Alert rules: [`ops/prometheus/alerts.yml`](../ops/prometheus/alerts.yml).

**Security:** production **fails startup** without `METRICS_BEARER_TOKEN` (unless `METRICS_ALLOW_INSECURE=true`); optional `METRICS_ALLOWLIST_IPS` / `METRICS_REQUIRE_PRIVATE_IP`; nginx private `allow` list — see [OBSERVABILITY.md](./OBSERVABILITY.md).

**Multi-instance rate limits:** set `REDIS_URL` (prod compose includes Redis + `RATE_LIMIT_REQUIRE_REDIS=true`).

**Local stack:** `docker compose -f docker-compose.observability.yml up -d` (Prometheus + node_exporter + Loki + Fluent Bit + Grafana).

## Auth performance

See **[AUTH_PERFORMANCE.md](./AUTH_PERFORMANCE.md)** for `BCRYPT_COST`, `UV_THREADPOOL_SIZE`, rate limits, scaling.

## Full ops guide

**[OBSERVABILITY.md](./OBSERVABILITY.md)** · **[UPTIME.md](./UPTIME.md)**
