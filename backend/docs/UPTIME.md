# External uptime monitoring

Monitor from **at least two geographic regions**. Prefer HTTPS on the public API hostname.

## Endpoints

| URL | Expect | Use |
|-----|--------|-----|
| `GET /api/health` | **200** JSON `ok:true` | Primary uptime (fails if DB down) |
| `GET /api/health/live` | **200** | Distinguishes “process dead” vs “DB down” |
| `GET /api/health/ready` | **200** | Same readiness signal as Kubernetes |

Alert when: **2+ consecutive failures**, or latency **p95 > 2s** for 5 minutes.

Keyword checks (optional): body contains `"ok":true` or `"status":"ready"`.

## Providers

### Better Stack (recommended)

1. Create monitor → HTTP(S) → `https://api.example.com/api/health`
2. Regions: pick 2–3 (e.g. US East, EU, Asia)
3. Interval: 30–60s
4. Add second monitor for `/api/health/live` (optional)
5. Incident → Slack / PagerDuty

### UptimeRobot

1. Add HTTP(S) monitor → `/api/health`
2. Interval: 5 min (free) or 1 min (paid)
3. Enable “Alert Contacts”
4. Optional keyword: `ready`

### Pingdom

1. Uptime check → `/api/health`
2. Multi-region probes enabled
3. Response time alert > 2000 ms

### Healthchecks.io

Better for **cron / worker** heartbeats (email-worker). For HTTP API, use Better Stack/UptimeRobot; optionally ping Healthchecks from an external synthetic that curls `/api/health`.

## Synthetic script (optional)

```bash
curl -fsS https://api.example.com/api/health | grep -q '"ok":true'
```

Wire to CI or a 1-minute cron that calls Healthchecks.io `/ping` on success.
