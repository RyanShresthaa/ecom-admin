# Authentication performance & production settings

## BCRYPT_COST

| Setting | Value |
|---------|-------|
| Env | `BCRYPT_COST` |
| Allowed | **10–15** (integer) |
| Default | `10` |
| Dev / small VMs | `10` |
| Production (recommended) | **`12`** when serial `bcrypt.compare` stays ≤ ~300–400 ms on your CPU |

On successful password login, if the stored hash cost is **lower** than `BCRYPT_COST`, the API **rehashes** and updates `users.password` (transparent migration). Failures to rehash do not block login.

```env
BCRYPT_COST=12
```

## UV_THREADPOOL_SIZE (do not set in application code)

Native `bcrypt` uses the **libuv threadpool**. Node’s default is **4**. Under concurrent logins, a small pool queues work and latency spikes.

Set this in the **process environment before Node starts** (systemd, Docker `ENV`, PM2 `env`, Kubernetes `env`):

```env
UV_THREADPOOL_SIZE=8
```

| Host CPUs | Suggested `UV_THREADPOOL_SIZE` |
|-----------|--------------------------------|
| 2–4 | 4–8 |
| 8 | 8–12 |
| 16+ | 12–16 |

Changing `process.env.UV_THREADPOOL_SIZE` **after** the process has started does **not** resize the pool. Startup validation only **warns** if unset/invalid.

Docker example:

```dockerfile
ENV UV_THREADPOOL_SIZE=8
ENV BCRYPT_COST=12
CMD ["node", "server.js"]
```

## Rate limits

| Limiter | Env | Default | Notes |
|---------|-----|---------|-------|
| Auth (login/refresh/…) | `RATE_LIMIT_AUTH` | 30 / 15 min | Protects bcrypt CPU |
| API | `RATE_LIMIT_API` | 300 / 15 min | General |
| Password reset | `RATE_LIMIT_PASSWORD` | 5 / 15 min | |
| Slow-down | `SLOW_DOWN_AFTER` | 80 | Progressive delay |

For multi-instance deploys, use a **shared store** for rate limits (Redis) if you need cluster-wide caps; in-memory limits are per process.

## Horizontal scaling

1. Run **N** API replicas behind a load balancer.
2. Sticky sessions are **not** required (JWT cookies are stateless aside from refresh token in DB).
3. Expect roughly **~25–30 successful logins/s per instance** at cost 10 with `UV_THREADPOOL_SIZE=8` on mid-tier CPUs; cost 12 is lower — measure under realistic concurrent logins before raising cost.
4. Scale on: login p95, bcrypt compare p95, CPU, and `429` rate.

## Metrics (Prometheus)

| Metric | Meaning |
|--------|---------|
| `app_bcrypt_hash_duration_seconds` | Hash latency by cost |
| `app_bcrypt_compare_duration_seconds` | Compare latency by cost |
| `app_auth_login_duration_seconds` | Full login handler latency by outcome |
| `app_auth_refresh_duration_seconds` | Refresh handler latency by outcome |
| `app_auth_login_attempts_total{outcome}` | success / failure / … |
| `app_auth_password_rehashes_total` | Cost-upgrade rehashes |

## Alert thresholds (documented)

Import [`ops/prometheus/auth-alerts.yml`](../ops/prometheus/auth-alerts.yml) or mirror in Grafana.

| Alert | Suggested threshold | Window |
|-------|---------------------|--------|
| High login latency | p95 `auth_login_duration_seconds` **> 2s** | 5m |
| High auth failure rate | `failure / (success+failure)` **> 30%** and volume **> 20** | 5m |
| Excessive 429 | rate of `http_requests_total{status_code="429"}` **> 1/s** | 5m |
| High CPU | `process_cpu` **> 85%** sustained | 10m |
| Bcrypt saturation | compare p95 **> 1.5s** | 5m |

Tune after baselining production traffic.
