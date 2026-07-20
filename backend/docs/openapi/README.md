# OpenAPI (Swagger) path modules

JSDoc `@openapi` YAML in these files is merged by `swagger-jsdoc` (`config/swagger.js`). Each **route** file’s header points to the module that documents its HTTP paths.

| File | Tags / area | Route modules |
|------|-------------|----------------|
| `health.paths.js` | Health | `server.js` (`/api/health`) |
| `user.paths.js` | Auth | `routes/user.route.js` |
| `catalog.paths.js` | Products, Categories, Subcategories | `product`, `category`, `subcategory` routes |
| `commerce.paths.js` | Cart, Orders, Addresses, Coupons, Reviews, Wishlist, Returns, Shop, Stock alerts | matching `routes/*.route.js` |
| `admin.paths.js` | Admin, Payment, Upload | `admin`, `payment`, `upload` routes |
| `inventory.paths.js` | Inventory | `routes/inventory.route.js` |
| `feedback.paths.js` | Feedback | `routes/feedback.route.js` |
| `blog.paths.js` | Blog | `routes/blog.route.js` |
| `chat.paths.js` | Chat | `routes/chat.route.js`, `admin/routes/chat.route.js` |
| `sales.paths.js` | Sales | `admin/routes/sales.route.js` |
| `purchases.paths.js` | Purchases | `admin/routes/purchase.route.js` |
| `scale.paths.js` | Scale | `routes/scale.route.js` |

**UI:** `GET /api/docs` · **JSON:** `GET /api/docs.json`

Shared schemas, tags, and security: `shared/config/swaggerDefinition.js`.

When you add a new route, add the path under the correct `*.paths.js` (or create a new `*.paths.js` — the glob in `config/swagger.js` picks up all `docs/openapi/*.paths.js` files automatically).
