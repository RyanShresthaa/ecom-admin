# Customer storefront

Separate app from admin. Same shared API + database (`backend/`).

| | Customer | Admin |
|--|----------|-------|
| Port | **5174** | 5173 |
| Login | `/login` here | `/login` in `admin/` |
| Token key | `orbit_customer_token` | `orbit_admin_token` |
| API | `backend` :5000 | Live store → `backend`; demo pages → `admin/server` |

```bash
# terminal 1
npm run dev:api

# terminal 2
npm run dev:customer
```

Open http://localhost:5174
