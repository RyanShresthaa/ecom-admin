# Matina ecom

```
admin/       staff UI     → :5173
customer/    shop UI      → :5174
backend/     shared API   → :5000
  customer/  storefront routes
  admin/     staff routes
  shared/    DB models, auth, utils
```

## Run

```bash
npm run dev:api       # shared backend :5000
npm run seed:staff    # once — staff login for admin
npm run dev:admin     # admin UI :5173 → backend
npm run dev:customer  # shop :5174 → backend
```

Staff login (after seed): `staff.verify@matinacrafts.com` / `StaffVerify123!`

- Admin: http://localhost:5173  
- Shop: http://localhost:5174  
- API docs: http://localhost:5000/api/docs  


See `STRUCTURE.md` and `backend/docs/ROUTE_MAP.md`.

## Deploy admin (Vercel)

In the Vercel project settings set **Root Directory** to `admin` (Framework: Next.js).  
Do **not** use `outputDirectory: dist` — that was for the old Vite build; Next.js uses `.next`.

Point `BACKEND_URL` / `NEXT_PUBLIC_API_URL` at your hosted API (e.g. Railway), not `localhost`.
