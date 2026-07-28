# Production observability & operations

Canonical guide for metrics, alerts, logs, traces, health probes, and incident response.
Complementary docs: [MONITORING.md](./MONITORING.md), [AUTH_PERFORMANCE.md](./AUTH_PERFORMANCE.md), [DEPLOYMENT.md](./DEPLOYMENT.md).

## Architecture

```
Clients → nginx (TLS) → Node API
                │
                ├─ /api/health*|uptime monitors (multi-region)
                ├─ /metrics   → Prometheus (private + bearer) → Grafana / Alertmanager
                ├─ stdout JSON → Fluent Bit → Loki | CloudWatch | Elastic | Datadog
                └─ OTLP (optional) → Tempo/Jaeger ; Sentry (errors)
```

## Health endpoints

| Path | Purpose |
|------|---------|
| `/api/health/live` | Liveness — process up |
| `/api/health/ready` | Readiness — PostgreSQL OK |
| `/api/health` | Detailed uptime check (503 if DB down) |

## Securing `/metrics`

1. **Require** `METRICS_BEARER_TOKEN` in production — **startup fails** without it (unless `METRICS_ALLOW_INSECURE=true`).
2. Optional `METRICS_ALLOWLIST_IPS=10.0.0.0/8,192.168.0.0/16`.
3. Optional `METRICS_REQUIRE_PRIVATE_IP=true`.
4. nginx: `location = /metrics { allow private; deny all; }` — see `deploy/nginx.conf.example`.
5. Prefer scraping on a **private** network / service mesh; never expose `/metrics` on the public internet.

Prometheus scrape:

```yaml
authorization:
  type: Bearer
  credentials_file: /etc/prometheus/metrics_token
```

## Metrics catalogue

HTTP / runtime: `app_http_*`, default Node process/heap/event-loop metrics.  
Auth: `app_auth_*`, `app_bcrypt_*`.  
Business: `app_business_orders_total`, `app_business_payments_total`, `app_business_checkout_total`, `app_business_users_total`, `app_business_uploads_total`, `app_business_newsletter_subscriptions_total`, `app_business_cart_abandonments_total{reason}`.

Cart abandonment:
- Explicit: `POST /api/cart/abandon` → `app_business_cart_abandonments_total` + checkout step `abandoned` (cancel page fires `stripe_cancel`).
- Funnel proxy: `1 - completed/started` on `app_business_checkout_total` (Grafana panel).

## Rate limiting (multi-instance)

Set `REDIS_URL` so express-rate-limit uses a shared Redis store. Production compose sets `RATE_LIMIT_REQUIRE_REDIS=true`. Without Redis, limits are **per process** (warned at startup).

## Alerting

Load `ops/prometheus/alerts.yml` into Prometheus / Grafana Alloy / Mimir ruler.

Critical examples: API down, readiness failures, 5xx spike, payment failure spike, low disk (node_exporter).  
Warning examples: latency, 429 flood, auth failure rate, CPU/memory/heap, event-loop lag.

## Logging (structured JSON)

Set `LOG_FORMAT=json` and `LOG_LEVEL=info`.

**Easiest production path:** container stdout → **Fluent Bit** DaemonSet → **Grafana Loki** (already pairs with Grafana). Config: `ops/logging/fluent-bit.conf`.

Local all-in-one stack:

```bash
mkdir -p secrets && printf 'change-me' > secrets/metrics_token.txt
docker compose -f docker-compose.observability.yml up -d
```

Includes Prometheus (scrapes API + node_exporter), Loki, Fluent Bit, Grafana with dashboard provisioning.

| Destination | Effort | Notes |
|-------------|--------|-------|
| **Loki + Fluent Bit** | Lowest with Grafana | Recommended |
| CloudWatch | Low on AWS | Uncomment CloudWatch output |
| Datadog | Low | Needs `DD_API_KEY` |
| Elasticsearch | Medium | Index lifecycle needed |
| Fluentd | Higher | Use only if already standard |

## Tracing

Optional OpenTelemetry: `OTEL_ENABLED=true` + `OTEL_EXPORTER_OTLP_ENDPOINT`.  
Errors: `SENTRY_DSN`.

## Dashboards

Import `ops/grafana/api-dashboard.json` — HTTP, auth, orders, payments, checkout funnel, DB probes, CPU/memory/heap/event-loop, rate limiting.

## Uptime monitoring

See [UPTIME.md](./UPTIME.md). Monitor `/api/health` (and optionally live/ready) from **≥2 regions**, alert on consecutive non-200.

## Incident response (runbook)

1. **Page:** Alertmanager / Better Stack / PagerDuty.
2. **Triage:** Grafana API dashboard + Loki logs (`requestId`) + Sentry.
3. **Health:** `curl /api/health/ready` — DB vs process.
4. **Auth storm:** check 429 + login failure rate; temporarily tighten WAF / raise awareness, do not disable rate limits blindly.
5. **Payment failures:** Stripe status + `app_business_payments_total`; check webhook logs.
6. **Rollback / scale:** redeploy previous image; increase replicas; verify `UV_THREADPOOL_SIZE` on new pods.
7. **Postmortem:** capture timeline, metrics screenshots, action items.

## Operational checklist

- [ ] `METRICS_BEARER_TOKEN` set (required to boot in production); nginx denies public `/metrics`
- [ ] `REDIS_URL` set when running >1 API replica (`RATE_LIMIT_REQUIRE_REDIS=true` in prod compose)
- [ ] Prometheus scrapes + `alerts.yml` loaded; Alertmanager routes to Slack/PagerDuty
- [ ] node_exporter running (disk alerts) — included in `docker-compose.observability.yml`
- [ ] Grafana dashboard imported / provisioned
- [ ] Fluent Bit → Loki (or chosen backend) shipping JSON
- [ ] Multi-region uptime on `/api/health`
- [ ] Sentry DSN set; optional OTEL collector
- [ ] Runbook owner + on-call rotation documented
