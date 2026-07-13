# Matina Crafts — eCommerce Admin Dashboard

A production-grade, Stripe-style admin dashboard for eCommerce operations. Built with React 18, TanStack Table & Query, Tailwind CSS, shadcn/ui-style components, and Phosphor Icons.

## ✨ Features

- **Dashboard** — KPI cards (Revenue, Orders, Users, Conversion Rate), a revenue/orders chart (Recharts), and a paginated Recent Orders table.
- **Products** — Full CRUD with an Add/Edit dialog, delete confirmation, search, category/status filters, server-side pagination & sorting, and a refresh button.
- **Orders** — Order list with inline delivery-status updates, a slide-over order details drawer, search, status/date-range filters, pagination & sorting.
- **Inventory** — Stock tracking per warehouse with automatic low-stock badges and row highlighting, filters, and pagination.
- **Settings** — Tax rules editor (add/edit/remove rate rules), currency, region, timezone, and low-stock threshold preferences, organized with tabs.
- **Lazy loading** — Every page is code-split with `React.lazy` + `Suspense`, so route chunks are only downloaded when visited.
- **Fully responsive** — Collapsible sidebar on mobile, responsive grids, and scrollable tables.

## 🔐 Authentication & roles

The dashboard is fully gated behind a mock auth system — `/login`, `/forgot-password`, and `/reset-password` are public; everything else requires a session.

**Demo accounts** (also listed as one-click fill buttons on the login screen):

| Role   | Email              | Password    | Access                                                        |
| ------ | ------------------- | ------------ | ---------------------------------------------------------------- |
| Admin   | `admin@matinacrafts.com`     | `admin123`     | Full access, including Settings                                   |
| Editor   | `editor@matinacrafts.com`     | `editor123`     | Read/write Products, Orders, Inventory — no Settings                |
| Viewer    | `viewer@matinacrafts.com`      | `viewer123`      | Read-only everywhere — no Settings, no Add/Edit/Delete actions       |

Sessions persist across reloads via a token in `localStorage` and are restored on app load (`AuthProvider` in `src/context/AuthContext.jsx`). Forgot Password issues a mock reset token and — since there's no real email server — surfaces a "demo only" link to continue the flow at `/reset-password?token=...`.

Permissions are centralized in `src/lib/permissions.js` as `resource:action` strings (e.g. `products:write`) mapped per role. Two ways to use them:

- **Hide/disable UI**: `const { can } = usePermissions(); {can('products:write') && <Button>...</Button>}`, or the equivalent `<RequirePermission permission="products:write">...</RequirePermission>` component.
- **Gate a whole route**: `<Route element={<ProtectedRoute permission="settings:view" />}>...</Route>` — redirects to `/` with a toast if the signed-in role lacks that permission, or to `/login` if not signed in at all.

The Products page applies this pattern end-to-end (Add/Edit/Delete hidden for read-only roles) as the reference implementation — apply the same `usePermissions()` / `<RequirePermission>` pattern to Orders, Inventory, and future pages as they're built out.

## 🧱 Tech stack



| Concern         | Library                                   |
| ---------------- | ------------------------------------------ |
| UI framework      | React 18 (Vite)                            |
| Routing           | React Router 6                             |
| Data fetching      | TanStack Query 5 (caching, refetch, mutations) |
| Tables             | TanStack Table 8 (manual pagination + sorting) |
| Styling            | Tailwind CSS 3                             |
| Components         | Custom shadcn/ui-style primitives (Radix UI under the hood) |
| Icons              | Phosphor Icons (`@phosphor-icons/react`)   |
| Charts             | Recharts                                   |
| Toasts             | Sonner                                     |

## 🚀 Getting started

```bash
npm install
npm run dev      # starts frontend (5173) + API (3000) together
```

Open **http://localhost:5173** and sign in with a demo account.

### Production

```bash
npm run build
npm start        # serves the app + API on http://localhost:3000
```

Data persists in `server/data/store.json`. Set `PORT` to change the listen port.

## Deploying to Vercel

The repo root (`admin/`) includes a `vercel.json` that builds `admin-dashboard/` automatically.

1. Push the repo to GitHub and import it in [Vercel](https://vercel.com).
2. In **Project → Settings → General**, use **one** of these setups (do not mix them):

   **Option A — repo root (recommended)**

   | Setting | Value |
   |---------|-------|
   | Root Directory | *(leave empty)* |
   | Build Command | *(leave empty — uses `vercel.json`)* |
   | Output Directory | *(leave empty — uses `vercel.json`)* |
   | Install Command | *(leave empty — uses `vercel.json`)* |

   **Option B — app subfolder**

   | Setting | Value |
   |---------|-------|
   | Root Directory | `admin-dashboard` |
   | Build Command | *(leave empty)* |
   | Output Directory | `dist` *(not `admin-dashboard/dist`)* |
   | Install Command | *(leave empty)* |

   If Root Directory is `admin-dashboard`, do **not** set Output Directory to `admin-dashboard/dist` — that double-nests the path and causes a site-wide **404**.

3. Add these environment variables in **Project → Settings → Environment Variables** (Production + Preview + Development):

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `/api` |
   | `DATABASE_URL` | *(auto-set if you linked Vercel Postgres / Neon Storage)* |

   If you created **Vercel Postgres / Neon** under **Storage**, `DATABASE_URL` / `POSTGRES_URL` are added automatically. Redeploy after linking.

4. Redeploy after changing settings or env vars.

**Note:** `VITE_*` variables are baked in at build time — if login/API calls fail after deploy, confirm `VITE_API_URL=/api` is set and trigger a new deployment.

### Persistent data (Postgres)

The API stores all demo data in a single Postgres JSONB document (`app_store` table) when `DATABASE_URL` or `POSTGRES_URL` is set. On first connection it creates the table and seeds demo data.

- **Vercel:** link Neon/Postgres in Storage, then redeploy.
- **Local:** copy `.env.example` → `.env` and paste your pooled `DATABASE_URL`.
- Without a DB URL, local/dev still uses `server/data/store.json`.

### Troubleshooting 404

- Use the **Production** URL from Vercel (e.g. `your-project.vercel.app`), not `localhost` or a machine IP.
- In Vercel → **Deployments**, confirm the latest deployment status is **Ready** (not Error).
- Open the deployment **Build Logs** and verify `admin-dashboard/dist/index.html` was produced.
- Clear **Root Directory** / **Output Directory** overrides in the dashboard if they conflict with the table above.
- After fixing settings, use **Deployments → … → Redeploy**.

## 📁 Project structure

```
server/              # Express API + Postgres/JSON persistence (see server/db.js)
src/
├── components/
│   ├── ui/            # shadcn/ui-style primitives (button, dialog, table, select, tabs, ...)
│   ├── layout/         # Sidebar, Topbar, DashboardLayout, AuthLayout
│   └── common/         # DataTable, DataTableToolbar, KpiCard, StatusBadge, ConfirmDialog, PageHeader, RequirePermission
├── pages/
│   ├── Dashboard/       # KPIs, SalesChart, RecentOrdersTable
│   ├── Products/        # columns, ProductFormDialog (add/edit) — RBAC reference implementation
│   ├── Orders/           # columns, OrderDetailsDrawer, OrderStatusDropdown
│   ├── Inventory/        # columns
│   ├── Settings/          # admin-only (route-gated)
│   └── Auth/               # Login, ForgotPassword, ResetPassword
├── context/
│   └── AuthContext.jsx      # AuthProvider + useAuth() — session state & persistence
├── hooks/                     # useProducts, useOrders, useInventory, useDashboard, useSettings,
│                                #   useAuthApi, usePermissions (TanStack Query + RBAC)
├── lib/
│   ├── api/                     # HTTP client (see docs/API.md)
│   ├── constants.js             # Static enums (categories, reason codes, defaults)
│   ├── http.js                  # fetch wrapper, VITE_API_URL
│   ├── queryKeys.js             # Centralized TanStack Query key factory
│   ├── permissions.js           # Role → permission matrix + hasPermission()
│   └── utils.js                 # cn(), formatCurrency(), formatDate(), etc.
├── routes/
│   ├── lazyPages.js                     # React.lazy() definitions for every page
│   ├── ProtectedRoute.jsx                # Auth + permission route guard
│   └── index.jsx                          # Route tree: public auth routes + protected dashboard routes
├── App.jsx                                 # QueryClientProvider + AuthProvider + Router + Toaster
└── main.jsx                                # Entry point
```

## 🔌 API

All data goes through **`src/lib/api/http-api.js`** → **`server/routes.js`**.

Default `.env`:

```env
VITE_API_URL=/api
```

In development, Vite proxies `/api` to the backend. In production, the same server serves both the built frontend and the API.

See **`docs/API.md`** for routes and deployment notes.

## 🗃️ Data & state patterns

- **Server-side table state**: pagination and sorting live in the page component's `useState`, get passed into the TanStack Query hook as `queryKey`/params, and the API returns the correctly paginated/sorted/filtered slice.
- **Debounced search**: `useDebouncedValue` delays search-triggered refetches by 350ms.
- **Optimistic-feeling refresh**: `isFetching` (not `isLoading`) drives the small "Updating…" indicator on tables, so existing rows stay visible during a refetch instead of flashing a skeleton.
- **Mutations** (`useCreateProduct`, `useUpdateOrderStatus`, etc.) invalidate the relevant query keys on success and surface toasts via `sonner`.

## 🎨 Design system

Colors, radii, and shadows are defined as CSS variables in `src/index.css` and mapped into Tailwind via `tailwind.config.js`, following the standard shadcn/ui token convention (`--primary`, `--muted`, `--destructive`, etc.) plus a couple of dashboard-specific additions (`--sidebar`, `--success`, `--warning`). Numeric/financial values use `IBM Plex Mono` with `tabular-nums` for a clean, fintech-style alignment.

## 📦 Available scripts

| Script           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`       | Start Vite + API concurrently                    |
| `npm run api`       | Start API only (port 3000)                       |
| `npm run build`      | Production build to `dist/`                       |
| `npm start`         | Serve `dist/` + API (run after `build`)           |
| `npm run lint`         | Run ESLint                                        |
