# Folder structure

```
matina-ecom/
├── admin/                         # Staff frontend (Next.js App Router)
│   ├── app/                       # Routes only (thin page shells)
│   │   ├── (auth)/                # login, forgot-password, reset-password
│   │   └── (dashboard)/           # protected workspace routes
│   ├── src/
│   │   ├── auth/                  # Protect gate
│   │   ├── components/            # layout, common, ui
│   │   ├── context/               # AuthProvider
│   │   ├── features/              # Page UI modules (Dashboard, Products, …)
│   │   ├── hooks/
│   │   ├── lib/                   # api, http, permissions, utils
│   │   └── providers/             # Query + auth + toaster
│   ├── public/
│   └── server/                    # LEGACY demo API — prefer backend/
├── customer/                      # Buyer frontend only
│   └── src/
└── backend/                       # Shared API (one DB)
    ├── customer/
    ├── admin/
    ├── shared/
    └── server.js
```

**Rule:** business logic lives in `backend/`. Frontends do not each own a backend.
