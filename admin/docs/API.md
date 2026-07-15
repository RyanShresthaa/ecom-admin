# Backend API contract

The admin dashboard talks to a REST API at `NEXT_PUBLIC_API_URL` (default: `/api`).

## Running locally

```bash
npm install
npm run dev    # starts Vite + API together
```

## Production deployment

```bash
npm run build
npm start      # serves dist/ + API on port 3000
```

Set `PORT` to change the listen port. Data persists in `server/data/store.json`.

## Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/login` | `{ email, password }` | `{ user, token }` |
| GET | `/auth/session` | — | `{ user }` (Bearer token) |
| POST | `/auth/logout` | — | `{ success: true }` |
| POST | `/auth/forgot-password` | `{ email }` | `{ success: true, devResetToken? }` |
| POST | `/auth/reset-password` | `{ token, password }` | `{ success: true }` |

`user` shape: `{ id, name, email, role, avatarColor, ... }` (no password).

**Demo accounts:** `admin@matinacrafts.com` / `admin123`, `editor@matinacrafts.com` / `editor123`, `viewer@matinacrafts.com` / `viewer123`

## List endpoints

All list routes accept query params: `page`, `pageSize`, `search`, plus domain filters.
Sorting is passed as `sorting` — a JSON string, e.g. `[{"id":"date","desc":true}]`.

Response shape:

```json
{ "rows": [], "pageCount": 0, "rowCount": 0 }
```

See `src/lib/api/http-api.js` for the full route list and `server/routes.js` for the implementation.
