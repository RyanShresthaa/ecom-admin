# Folder structure

```
matina-ecom/
├── admin/                     # Staff frontend only
│   ├── src/
│   └── server/                # LEGACY demo API — prefer backend/
├── customer/                  # Buyer frontend only
│   └── src/
└── backend/                   # Shared API (one DB)
    ├── customer/              # storefront routes + controllers
    ├── admin/                 # staff routes + controllers
    ├── shared/                # config, models, middleware, utils
    └── server.js
```

**Rule:** business logic lives in `backend/`. Frontends do not each own a backend.
