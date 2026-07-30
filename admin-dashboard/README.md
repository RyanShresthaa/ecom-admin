# Orbit Admin — eCommerce Admin Dashboard

A production-grade, Stripe-style admin dashboard for eCommerce operations. Built with React 18, TanStack Table & Query, Tailwind CSS, shadcn/ui-style components, and Phosphor Icons.

## ✨ Features

- **Dashboard** — KPI cards (Revenue, Orders, Users, Conversion Rate), a revenue/orders chart (Recharts), and a paginated Recent Orders table.
- **Products** — Full CRUD with an Add/Edit dialog, delete confirmation, search, category/status filters, server-side pagination & sorting, and a refresh button.
- **Orders** — Order list with inline delivery-status updates, a slide-over order details drawer, search, status/date-range filters, pagination & sorting.
- **Inventory** — Stock tracking per warehouse with automatic low-stock badges and row highlighting, filters, and pagination.
- **Settings** — Tax rules editor (add/edit/remove rate rules), currency, region, timezone, and low-stock threshold preferences, organized with tabs.
- **Lazy loading** — Every page is code-split with `React.lazy` + `Suspense`, so route chunks are only downloaded when visited.
- **Fully responsive** — Collapsible sidebar on mobile, responsive grids, and scrollable tables.

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
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Build for production
npm run build

# 4. Preview the production build
npm run preview
```

The app runs entirely on a **mock API** (see below), so there's nothing else to configure — just `npm install && npm run dev`.

## 📁 Project structure

```
src/
├── components/
│   ├── ui/            # shadcn/ui-style primitives (button, dialog, table, select, tabs, ...)
│   ├── layout/         # Sidebar, Topbar, DashboardLayout
│   └── common/         # DataTable, DataTableToolbar, KpiCard, StatusBadge, ConfirmDialog, PageHeader
├── pages/
│   ├── Dashboard/       # KPIs, SalesChart, RecentOrdersTable
│   ├── Products/        # columns, ProductFormDialog (add/edit)
│   ├── Orders/           # columns, OrderDetailsDrawer, OrderStatusDropdown
│   ├── Inventory/        # columns
│   └── Settings/
├── hooks/                # useProducts, useOrders, useInventory, useDashboard, useSettings (TanStack Query)
├── lib/
│   ├── api.js             # API client abstraction (see below)
│   ├── queryKeys.js        # Centralized TanStack Query key factory
│   └── utils.js             # cn(), formatCurrency(), formatDate(), etc.
├── mock/
│   ├── database.js          # In-memory seed data (products, orders, inventory, settings)
│   ├── generators.js         # Deterministic fake-data helpers
│   └── server.js              # Simulated REST endpoints: latency, pagination, filtering, sorting, CRUD
├── routes/
│   ├── lazyPages.js            # React.lazy() definitions for every page
│   └── index.jsx                 # Route tree wrapped in <Suspense>
├── App.jsx                        # QueryClientProvider + Router + Toaster
└── main.jsx                        # Entry point
```

## 🔌 API client

Every data call goes through **`src/lib/api.js`** (Axios via `src/lib/http.js`) against the Express backend (`VITE_API_URL`). List endpoints return `{ rows, pageCount, rowCount }`; single resources return plain objects.

## 🗃️ Data & state patterns

- **Server-side table state**: pagination and sorting live in the page component's `useState`, get passed into the TanStack Query hook as `queryKey`/params.
- **Debounced search**: `useDebouncedValue` delays search-triggered refetches by 350ms.
- **Optimistic-feeling refresh**: `isFetching` (not `isLoading`) drives the small "Updating…" indicator on tables, so existing rows stay visible during a refetch instead of flashing a skeleton.
- **Mutations** (`useCreateProduct`, `useUpdateOrderStatus`, etc.) invalidate the relevant query keys on success and surface toasts via `sonner`.

## 🎨 Design system

Colors, radii, and shadows are defined as CSS variables in `src/index.css` and mapped into Tailwind via `tailwind.config.js`, following the standard shadcn/ui token convention (`--primary`, `--muted`, `--destructive`, etc.) plus a couple of dashboard-specific additions (`--sidebar`, `--success`, `--warning`). Numeric/financial values use `IBM Plex Mono` with `tabular-nums` for a clean, fintech-style alignment.

## 📦 Available scripts

| Script           | Description                  |
| ----------------- | ----------------------------- |
| `npm run dev`       | Start the Vite dev server      |
| `npm run build`      | Production build to `dist/`     |
| `npm run preview`     | Preview the production build     |
| `npm run lint`         | Run ESLint                        |
