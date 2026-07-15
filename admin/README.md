# Matina Crafts — eCommerce Admin Dashboard

> **Path:** `admin/` (this is the live admin UI).  
> Shared ecom API: `../backend`.  
> Customer storefront: `../customer`.  
> From repo root: `npm run dev`

A production-grade, Stripe-style admin dashboard for eCommerce operations. Built with **Next.js 15** (App Router), TanStack Table & Query, Tailwind CSS, shadcn/ui-style components, and Phosphor Icons.

## ✨ Features

- **Dashboard** — KPI cards (Revenue, Orders, Users, Conversion Rate), a revenue/orders chart (Recharts), and a paginated Recent Orders table.
- **Products** — Full CRUD with an Add/Edit dialog, delete confirmation, search, category/status filters, server-side pagination & sorting, and a refresh button.
- **Orders** — Order list with inline delivery-status updates, a slide-over order details drawer, search, status/date-range filters, pagination & sorting.
- **Inventory** — Stock tracking per warehouse with automatic low-stock badges and row highlighting, filters, and pagination.
- **Settings** — Tax rules editor (add/edit/remove rate rules), currency, region, timezone, and low-stock threshold preferences, organized with tabs.
- **Code splitting** — Next.js App Router loads route segments on demand.
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
- **Gate a whole route**: wrap with `<Protect permission="settings:view">` (see `src/auth/Protect.jsx` and `app/(dashboard)/settings/page.jsx`) — redirects to `/` with a toast if the signed-in role lacks that permission, or to `/login?from=…` if not signed in.

The Products page applies this pattern end-to-end (Add/Edit/Delete hidden for read-only roles) as the reference implementation — apply the same `usePermissions()` / `<RequirePermission>` pattern to Orders, Inventory, and future pages as they're built out.

## 🧱 Tech stack



| Concern         | Library                                   |
| ---------------- | ------------------------------------------ |
| UI framework      | Next.js 15 (App Router) + React 18         |
| Routing           | Next.js App Router                         |
| Data fetching      | TanStack Query 5 (caching, refetch, mutations) |
| Tables             | TanStack Table 8 (manual pagination + sorting) |
| Styling            | Tailwind CSS 3                             |
| Components         | Custom shadcn/ui-style primitives (Radix UI under the hood) |
| Icons              | Phosphor Icons (`@phosphor-icons/react`)   |
| Charts             | Recharts                                   |
| Toasts             | Sonner                                     |

## 🚀 Getting started

From the **repo root** (recommended):

```bash
npm run dev:api      # shared backend on :5000
npm run dev:admin    # Next.js admin on :5173
```

Or inside `admin/`:

```bash
npm install
npm run dev          # http://localhost:5173  (API proxied to :5000)
```

Sign in with a staff account (see seed: `npm run seed:staff` from repo root).

### Production

```bash
npm run build
npm start            # http://localhost:5173
```

Set `NEXT_PUBLIC_API_URL` to your API base (default `/api`, rewritten to `BACKEND_URL` / `http://localhost:5000`).

## Deploying to Vercel

Point the Vercel project **Root Directory** at `admin/` (Next.js framework). Deploy the shared API (`backend/`) separately and set:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | Absolute URL to your API, e.g. `https://api.example.com/api` |
| `BACKEND_URL` | (optional, local rewrites only) Backend origin |

`NEXT_PUBLIC_*` values are baked in at build time — redeploy after changing them.

## 📁 Project structure

```
app/                       # Next.js App Router (route shells only)
├── (auth)/                # login, forgot-password, reset-password
├── (dashboard)/           # protected workspace pages + layout
├── layout.jsx             # fonts, providers, metadata
└── globals.css
src/
├── auth/Protect.jsx       # Auth + permission gate
├── providers/             # QueryClient + Auth + Toaster
├── components/
│   ├── ui/                # shadcn/ui-style primitives
│   ├── layout/            # Sidebar, Topbar, DashboardLayout, AuthLayout
│   └── common/            # DataTable, KpiCard, RequirePermission, …
├── features/              # Page UI modules (Dashboard, Products, Orders, …)
├── context/AuthContext.jsx
├── hooks/                 # TanStack Query hooks + usePermissions
└── lib/
    ├── api/               # backend-api adapter (shared backend/)
    ├── http.js            # fetch wrapper (NEXT_PUBLIC_API_URL)
    ├── permissions.js
    └── …
server/                    # Legacy demo API only — prefer ../backend
```

## 🔌 API

The UI talks to the shared **`backend/`** via `src/lib/api/backend-api.js` → `src/lib/http.js`.

```env
NEXT_PUBLIC_API_URL=/api
```

In development, Next.js rewrites `/api/*` to `http://localhost:5000/api/*`.

See **`docs/API.md`** for route shapes.

## 🗃️ Data & state patterns

- **Server-side table state**: pagination and sorting live in the page component's `useState`, get passed into the TanStack Query hook as `queryKey`/params, and the API returns the correctly paginated/sorted/filtered slice.
- **Debounced search**: `useDebouncedValue` delays search-triggered refetches by 350ms.
- **Optimistic-feeling refresh**: `isFetching` (not `isLoading`) drives the small "Updating…" indicator on tables, so existing rows stay visible during a refetch instead of flashing a skeleton.
- **Mutations** (`useCreateProduct`, `useUpdateOrderStatus`, etc.) invalidate the relevant query keys on success and surface toasts via `sonner`.

## 🎨 Design system

Colors, radii, and shadows are defined as CSS variables in `app/globals.css` and mapped into Tailwind via `tailwind.config.js`, following the standard shadcn/ui token convention (`--primary`, `--muted`, `--destructive`, etc.) plus a couple of dashboard-specific additions (`--sidebar`, `--success`, `--warning`). Numeric/financial values use `IBM Plex Mono` with `tabular-nums` for a clean, fintech-style alignment.

## 📦 Available scripts

| Script              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run dev`          | Next.js dev server on port 5173                  |
| `npm run build`         | Production Next.js build                         |
| `npm start`            | Serve production build on port 5173              |
| `npm run lint`            | Next.js ESLint                                   |
| `npm run dev:demo-api`    | Legacy local demo API (`server/`) only           |
