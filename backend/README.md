# UNSORTED Backend (Node.js + Express + Supabase)

Production-ready backend for the UNSORTED store. All product data lives in
Supabase (PostgreSQL); there is **no `db.json`** and no filesystem persistence.

Architecture (single consistent flow):

```
routes
  ↓
controllers
  ↓
services
  ↓
repositories
  ↓
Supabase
```

- Controllers: parse requests, validate payloads, shape responses.
- Services: business logic (slug generation, category resolution, statuses).
- Repositories: data access — the only layer that talks to Supabase.

---

## Setup

```bash
cd backend
npm install
npm run dev
```

Server runs at **http://localhost:3001** (nodemon auto-restarts on change).

---

## Environment variables

Copy `.env.example` to `.env` and fill in real values:

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL (Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only key; bypasses RLS |
| `SUPABASE_ANON_KEY` | optional | Anon key (falls back to it if no service key) |
| `CLOUDINARY_CLOUD_NAME` | yes | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | yes | Cloudinary API secret |
| `JWT_SECRET` | yes | Signs admin tokens (Sprint 15) |
| `JWT_EXPIRES_IN` | no | Default `1d` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | no | JWT login credentials |
| `ADMIN_PASSWORD_HASH` | optional | bcrypt hash; preferred over plaintext password |
| `ADMIN_NAME` / `ADMIN_ROLE` | no | Token claims |
| `PORT` | no | Default `3001` |
| `HOST` | no | Default `0.0.0.0` |
| `LOG_LEVEL` | no | `debug` \| `info` \| `warn` \| `error` (default `info`) |
| `NODE_ENV` | no | `development` (default) or `production` |
| `CORS_ORIGINS` | production only | Comma-separated allowed origins |

The server **starts even without** Supabase/Cloudinary credentials (logs a
warning, skips verification). Add them and restart to see them connect.

---

## Folder structure

```
backend/
├── server.js              # Entry — security headers (Helmet), CORS, mounts /api
├── config/
│   ├── env.js             # Raw environment loading (dotenv)
│   └── index.js           # Centralized typed config object
├── database/
│   ├── client.js          # Reusable Supabase client (singleton)
│   ├── schema.sql         # Canonical schema (reference / full rebuild)
│   └── migrations/
│       └── 001_initial_schema.sql   # Idempotent migration
├── cloudinary/
│   └── client.js          # Reusable Cloudinary client (singleton)
├── controllers/
│   ├── auth.controller.js
│   ├── health.controller.js
│   └── product.controller.js
├── validators/
│   └── product.validator.js   # Request-body validation
├── middleware/
│   ├── auth.middleware.js # JWT verifyAdmin
│   ├── errorHandler.js    # Centralized JSON error handler
│   └── notFound.js        # JSON 404 for unmatched /api paths
├── repositories/
│   ├── health.repository.js   # Connectivity probes
│   └── product.repository.js  # Product + category data access
├── routes/
│   ├── index.js           # Aggregator — mounts all route modules
│   ├── health.routes.js
│   ├── product.routes.js
│   ├── auth.routes.js
│   └── admin.routes.js    # JWT-protected admin endpoints
├── services/
│   ├── auth.service.js        # JWT issue/verify + login
│   ├── connection.service.js  # Verifies Supabase + Cloudinary at boot
│   ├── health.service.js      # Liveness payload
│   └── product.service.js     # Product CRUD business logic
└── utils/
    ├── apiError.js        # Typed HTTP errors (400/404/409/500)
    ├── asyncHandler.js    # Async error forwarding for controllers
    └── logger.js          # Leveled console logger
```

---

## API

### Auth (JWT, admin)

```http
POST /api/auth/login      → { success, token, admin }   # public
GET  /api/auth/me         → { success, admin }          # Bearer token
```

### Products

| Endpoint | Auth | Description |
| --- | --- | --- |
| `GET /api/products` | public | Active products only (`is_active = true`) — customer catalog |
| `GET /api/products/:id` | public | Single product (404 when hidden/unknown) |
| `GET /api/admin/products` | JWT | **All** products, including hidden — admin |
| `POST /api/products` | JWT | Create |
| `PUT /api/products/:id` | JWT | Partial update |
| `DELETE /api/products/:id` | JWT | Delete |

Responses keep the shape the frontends expect:

- `GET /api/products` → array of `{ id, name, description, category, price, oldPrice, imageUrl, stockQuantity, sale, is_active }`
- `POST/PUT` → `{ ok, product }`
- `DELETE` → `{ ok }`

### Cart

The customer/guest cart is served by the modern DB-backed stack under
`/api/customer/cart` (see `routes/cart.routes.js`). The old in-memory `/cart`
endpoints of the legacy single-page site were removed in Sprint 22.6 Phase 2.

### Health

```http
GET /api/health → { "status": "ok" }
```

---

## Database schema

Tables: `categories`, `products`, `users`, `addresses`, `wishlist`, `cart`,
`cart_items`, `orders`, `order_items`.

- Identity PKs for the catalog (`categories`, `products`); UUID PKs for user-scoped tables.
- Proper FKs with sensible `ON DELETE` behavior.
- Check constraints for enums and non-negative money/quantity.
- Indexes on every FK and hot query column.
- `updated_at` triggers via a shared `set_updated_at()` function.
- RLS enabled — catalog is publicly readable; the backend uses the
  service-role key, which bypasses RLS.

### Applying the schema

```bash
psql "$SUPABASE_DB_URL" -f database/migrations/001_initial_schema.sql
```

The migration is idempotent (`IF NOT EXISTS`) — safe to re-run.

---

## Verification

```bash
npm install
npm run dev
curl http://localhost:3001/api/health   # -> { "status": "ok" }
curl http://localhost:3001/api/products # -> [ ...active products... ]
```

Expected boot log (with credentials configured):

```
[unsorted] ... INFO Supabase client initialized
[unsorted] ... INFO Supabase connected (categories: N)
[unsorted] ... INFO Cloudinary client configured
[unsorted] ... INFO Cloudinary connected
```
