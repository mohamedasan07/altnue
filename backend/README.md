# UNSORTED Backend (Node.js + Express)

Production-ready foundation (Sprint 13A) layered on top of the existing
single-file Express server. The legacy API (products, admin, cart) is
**untouched** — this sprint only adds the backend foundation:

- Supabase (PostgreSQL) client
- Cloudinary client
- Clean folder separation (config → routes → controllers → services → repositories)
- Centralized environment configuration
- `GET /api/health` liveness endpoint
- Initial database schema + migration SQL

Frontend still uses LocalStorage — **no data migration happens in this sprint**.

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
| `SUPABASE_URL` | for DB work | Supabase project URL (Project Settings → API) |
| `SUPABASE_ANON_KEY` | for DB work | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Server-only key; bypasses RLS. Preferred once auth/CRUD lands |
| `CLOUDINARY_CLOUD_NAME` | for images | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | for images | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | for images | Cloudinary API secret |
| `PORT` | no | Default `3001` |
| `HOST` | no | Default `0.0.0.0` |
| `LOG_LEVEL` | no | `debug` \| `info` \| `warn` \| `error` (default `info`) |
| `NODE_ENV` | no | `development` (default) or `production` |
| `CORS_ORIGINS` | production only | Comma-separated allowed origins |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `SESSION_SECRET` | legacy admin | Keep for existing admin routes |

The server **starts even without** Supabase/Cloudinary credentials (logs a
warning, skips verification). Add them and restart to see them connect.

---

## Folder structure

```
backend/
├── server.js              # Entry — legacy routes + mounts the modular API
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
│   └── health.controller.js
├── middleware/
│   ├── errorHandler.js    # Centralized JSON error handler
│   └── notFound.js        # JSON 404 for unmatched /api paths
├── repositories/
│   └── health.repository.js   # Data-access layer (DB probes)
├── routes/
│   ├── index.js           # Aggregator — register future route modules here
│   └── health.routes.js
├── services/
│   ├── connection.service.js  # Verifies Supabase + Cloudinary at boot
│   └── health.service.js      # Liveness payload
└── utils/
    ├── asyncHandler.js    # Async error forwarding for controllers
    └── logger.js          # Leveled console logger
```

Request flow: `routes/` → `controllers/` → `services/` → `repositories/` →
Supabase. Config is read only through `config/index.js`.

---

## API

### Health

```http
GET /api/health
```

```json
{ "status": "ok" }
```

At boot the server also verifies external services and logs the result
(e.g. `Supabase connected (categories: 3)`, `Cloudinary connected`). Failures
are logged but never crash the process.

### Legacy (unchanged)

- `GET /api/products`, `GET /api/products/:id`
- `POST/PUT/DELETE /api/products/:id` (admin)
- `GET /cart`, `POST /cart`, `PUT /cart/:id`, `DELETE /cart/:id`
- `GET /api/orders`, `PUT /api/orders/:id` (admin)
- `GET /api/users`, `DELETE /api/users/:id` (admin)
- `/admin` admin panel

---

## Database schema

Tables: `categories`, `products`, `users`, `addresses`, `wishlist`, `cart`,
`cart_items`, `orders`, `order_items`.

- **UUID PKs** (`gen_random_uuid()`) for user-scoped tables; identity PKs for catalog.
- **Proper FKs** with sensible `ON DELETE` behavior (cascade for owned data,
  `SET NULL` to preserve order/product history).
- **Check constraints** for enums (status, payment_status, role) and
  non-negative money/quantity.
- **Indexes** on every FK and hot query column.
- **`updated_at` triggers** via a shared `set_updated_at()` function.
- **RLS enabled** — catalog is publicly readable; user-scoped tables are locked
  until authentication lands (backend uses the service-role key, which bypasses RLS).

### Applying the schema

Supabase SQL Editor, or from the CLI:

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
```

Expected boot log (with credentials configured):

```
[unsorted] ... INFO Supabase client initialized
[unsorted] ... INFO Supabase connected (categories: N)
[unsorted] ... INFO Cloudinary client configured
[unsorted] ... INFO Cloudinary connected
```
