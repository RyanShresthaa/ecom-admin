# Backend layout — customer / admin / shared

```
backend/
├── server.js                 # one Express app, one DB
├── customer/                 # storefront API
│   ├── index.js              # mounts /api/user, /product, /cart, …
│   ├── routes/
│   └── controllers/
├── admin/                    # staff API
│   ├── index.js              # mounts /api/admin, /inventory, /sales, /purchases
│   ├── routes/
│   └── controllers/
├── shared/                   # used by both
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── utils/
│   └── validation/
├── db/migrations/
└── scripts/
```

Same process, same Postgres. Frontends:

- `customer/` app → customer routes  
- `admin/` app → admin routes (+ Live store uses customer catalog with staff role)

## Customer mounts (`backend/customer`)

| Prefix | Purpose |
|--------|---------|
| `/api/user` | Auth, profile |
| `/api/product` | Catalog (staff can also write) |
| `/api/category` | Categories |
| `/api/subcategory` | Subcategories |
| `/api/cart` | Cart |
| `/api/order` | Orders / checkout |
| `/api/address` | Addresses |
| `/api/payment` | Payments |
| `/api/coupon` | Coupons |
| `/api/review` | Reviews |
| `/api/wishlist` | Wishlist |
| `/api/return` | Returns |
| `/api/shop` | Shop settings |
| `/api/feedback` | Feedback |
| `/api/upload` | Uploads (staff-gated) |

## Admin mounts (`backend/admin`)

| Prefix | Purpose |
|--------|---------|
| `/api/admin` | Dashboard, users, sellers |
| `/api/inventory` | Warehouses / stock |
| `/api/sales` | Sales docs |
| `/api/purchases` | Purchase / VAT |

## Shared

| Path | Purpose |
|------|---------|
| `/api/health` | Health (also `/api/v1/health`) |
| `/api/ready` | Readiness probe (also `/api/v1/ready`) |
| `/api/docs` | Swagger |
