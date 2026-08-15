# UNSORTED — Sprint 22.2 Audit (Live Admin Dashboard & Analytics)

**Status:** Audit only — no code written, no schema changed, no commits.
**Base commit:** `da6c089` ("fix: validate admin session and handle unauthorized access") — working tree clean.
**Scope:** Replace every mock value on the Admin Dashboard with live Supabase data, preserving the existing design and the existing `routes -> controllers -> services -> repositories -> Supabase` architecture. Nothing is implemented until this audit is approved.

---

## 1. Current Admin Dashboard Audit

### 1.1 Dashboard page

| Item | Location | Notes |
|---|---|---|
| Dashboard route | `admin-frontend/src/routes/AppRoutes.jsx:36` | `/dashboard` -> `<DashboardPage />` inside `ProtectedRoute` + `AdminLayout` |
| Dashboard page | `admin-frontend/src/pages/Dashboard/DashboardPage.jsx` | Compose-only view: header, stat grid, two two-column rows, quick actions |
| Page styles | `admin-frontend/src/pages/Dashboard/DashboardPage.module.css` | 4-col stat grid, `2fr/1fr` rows, responsive breakpoints — **keep as-is** |
| Layout / nav | `layouts/AdminLayout.jsx`, `components/layout/Sidebar.jsx` | Dashboard is the first sidebar item (`/dashboard`) — unchanged |
| Customers / Analytics pages | `pages/Customers/CustomersPage.jsx`, `pages/Analytics/AnalyticsPage.jsx` | **Stubs** (`<h1>`) — out of scope; Dashboard is the only live-data consumer this sprint |

### 1.2 Dashboard sections and their data source

| Section | Component | Data today | Data source |
|---|---|---|---|
| Statistics cards (Revenue, Orders, Products, Customers) | `components/dashboard/StatCard.jsx` | `dashboardStats` from mock file | **Mock** (`data/dashboard.js`) |
| Sales overview chart | `components/dashboard/SalesChart.jsx` | `salesOverview` imported directly | **Mock** (recharts `AreaChart`) |
| Recent Activity list | `components/dashboard/ActivityItem.jsx` | `recentActivity` | **Mock** |
| Recent Orders table | `components/dashboard/RecentOrders.jsx` | `recentOrders` imported directly | **Mock** |
| Low Stock Products list | `components/dashboard/LowStockList.jsx` | `lowStockProducts` imported directly | **Mock** |
| Quick Actions | `components/dashboard/QuickActions.jsx` | `quickActions` | **Static configuration** (nav links) — not business data |

### 1.3 The mock data file — `admin-frontend/src/data/dashboard.js`

Single mock file, created Sprint 17; its header literally reads *"Static sample values only; backend integration comes in a later sprint."* It exports six arrays:

- **`dashboardStats`** (lines 15–56) — 4 cards. **All values are hardcoded `0`/`₹0` with invented percentages** (`+12.5%`, `+8.2%`, `+3.4%`, `+5.1%`).
- **`salesOverview`** (58–65) — 6 fixed months (Jan–Jun) with invented `revenue`/`orders`.
- **`recentOrders`** (67–103) — 5 invented orders (`#ORD-1024` … `#ORD-1020`).
- **`lowStockProducts`** (105–138) — 4 invented products with hardcoded Cloudinary URLs.
- **`recentActivity`** (140–169) — 4 invented events ("Admin added product", "Order shipped", …).
- **`quickActions`** (171–204) — static nav configuration (real links, not fake data).

**Consumers of the mock file (5 files):**

1. `DashboardPage.jsx:4` — `dashboardStats, recentActivity`
2. `components/dashboard/SalesChart.jsx:11` — `salesOverview`
3. `components/dashboard/RecentOrders.jsx:1` — `recentOrders`
4. `components/dashboard/LowStockList.jsx:2` — `lowStockProducts`
5. `components/dashboard/QuickActions.jsx:3` — `quickActions`

**Everything displayed on the Dashboard is mocked.** The only real value on the page is the greeting name (`admin` from `/auth/me`).

### 1.4 Which components are already prop-driven (reusable as-is)

- **`StatCard`** — fully props-driven (`{ icon, label, value, percentage, hint, trend, accent }`). **No change needed**; the page supplies live stat objects in the same shape.
- **`SectionCard`** — pure layout container (`title`, `subtitle`, `action`, `children`). **No change needed.**
- **`ActivityItem`** — fully props-driven (`{ type, title, detail, time }`; type map `product|order|ship|update`). **No change needed**; it needs live activity objects.
- **`QuickActions`** — static nav; needs the `quickActions` config relocated (see §6).

**Which must change:** `SalesChart`, `RecentOrders`, `LowStockList` import the mock file directly and must become prop-driven. No redesign — same DOM/CSS, only the data flows in as props.

---

## 2. Backend Audit

### 2.1 Layered architecture (verified, working)

```
routes/  ->  controllers/  ->  services/  ->  repositories/  ->  Supabase (PostgREST)
```

- **Bootstrap:** `server.js` mounts `app.use('/api', apiRouter)`; per-domain routers are registered in `routes/index.js:18–32`.
- **Auth:** `middleware/auth.middleware.js` — `authorize('admin')` attaches `req.admin`; used by every admin endpoint. The dashboard router must use the same guard.
- **Conventions:** every repository returns the envelope `{ ok: true, data, [count] } | { ok: false, reason, [code] }`; every service maps repo failures to `ApiError` via a local `toDbError()`; controllers are thin and shape the response; validators allowlist every query/payload value (see `validators/adminOrder.validator.js`).

### 2.2 Existing modules (directly reusable)

| Layer | File | Reuse for the dashboard |
|---|---|---|
| Repository | `repositories/order.repository.js` | **`ORDER_WITH_ITEMS` projection (exported)** — recent orders with items in one embedded query |
| Repository | `repositories/product.repository.js` | `PRODUCT_COLUMNS` (with joined category), `findAllProducts({ activeOnly })` |
| Repository | `repositories/adminOrder.repository.js` | `findAllOrders()` pattern (range + exact count + allowlisted sort); per-status filtering |
| Repository | `repositories/user.repository.js` | `USER_SAFE_COLUMNS` (never exposes password fields) |
| Service | `services/order.service.js` | **`normalizeOrder(row)` (exported, unmodified)** — reuse for recent orders |
| Service | `services/adminOrder.service.js` | `adminOrderFor()` (normalizeOrder + `createdAt`/`updatedAt`); the `toDbError()` pattern |
| Service | `services/product.service.js` | `listAllProducts()`, `normalizeProduct()` |
| Service | `services/customerAuth.service.js` | `normalizeCustomer()` (exported) — reuse for latest customers |
| Validator | `validators/adminOrder.validator.js` | Query-parse pattern with allowlists + combined 400 message; `ORDER_STATUSES` |

### 2.3 Which dashboard metrics already exist implicitly

Every requested metric is derivable from **three existing tables** — no new tables, no new columns:

- **Orders** already carry `status`, `payment_status`, `grand_total`, `placed_at` → revenue, order totals, pending/delivered/cancelled counts, monthly sales trend.
- **Products** already carry `is_active`, `stock_quantity` → active/hidden/low-stock counts.
- **Users** already carry `role` (`'customer' | 'admin'`) → total customers.
- **order_items** already snapshot `product_id`, `name`, `quantity`, `price_at_order` → best sellers (filtered by non-cancelled orders).

The pieces that do **not** exist anywhere: a dashboard service/repository/router, the dashboard API contract, and any frontend fetch wiring. This is a **wiring sprint**, not a design sprint.

---

## 3. Database Audit

Schema lives in `backend/database/migrations/001_initial_schema.sql` (tables + indexes + triggers), `002_customer_auth.sql` (reset columns + users RLS), `003_addresses.sql` (address RLS + one-default index). All tables relevant to the dashboard already exist and are migrated.

### 3.1 Tables available

| Table | Key columns (dashboard-relevant) | Reuse |
|---|---|---|
| `users` | `id`, `email`, `first_name`, `last_name`, `role`, `is_active`, `created_at`, `last_login_at` | customers |
| `products` | `id`, `name`, `price`, `image_url`, `stock_quantity`, `is_sale`, `is_active`, `created_at`, `updated_at` | product counts, low stock |
| `categories` | `id`, `name`, `slug`, `is_active` | joined to products (display category) |
| `orders` | `id`, `user_id`, `order_number`, `status`, `payment_status`, `subtotal`, `discount`, `shipping`, `tax`, `grand_total`, `placed_at` | revenue, order stats, trend, recent |
| `order_items` | `id`, `order_id`, `product_id`, `name`, `price_at_order`, `image_url`, `quantity` | best sellers |
| `addresses` | (user-owned) | not needed |
| `wishlist` | (user-owned) | not needed |
| `cart` / `cart_items` | (active/checked_out) | not needed |

### 3.2 Exactly how each metric is calculated

| Metric | Derivation | Columns | Index used |
|---|---|---|---|
| Total Revenue | `SUM(grand_total)` over orders where `status NOT IN ('cancelled','refunded')` | `grand_total`, `status` | `idx_orders_status` |
| Total Orders | `COUNT(*)` over orders | — | — |
| Pending Orders | `COUNT(*)` where `status = 'pending'` | `status` | `idx_orders_status` |
| Delivered Orders | `COUNT(*)` where `status = 'delivered'` | `status` | `idx_orders_status` |
| Cancelled Orders | `COUNT(*)` where `status = 'cancelled'` | `status` | `idx_orders_status` |
| Total Customers | `COUNT(*)` over users where `role = 'customer'` | `role` | (none; seq scan fine at current scale) |
| Total Products | `COUNT(*)` over products | — | — |
| Active Products | `COUNT(*)` where `is_active = true` | `is_active` | `idx_products_active` |
| Hidden Products | `COUNT(*)` where `is_active = false` | `is_active` | `idx_products_active` |
| Low Stock Products | `COUNT(*)` where `is_active = true` and `stock_quantity <= LOW_STOCK_THRESHOLD` (default 10) | `stock_quantity`, `is_active` | `idx_products_active` (+ seq scan on stock) |
| Best Selling Products | For each `product_id`, `SUM(order_items.quantity)` joined to orders where `orders.status NOT IN ('cancelled','refunded')`, order by sum desc, take top N; name/image from the `order_items` snapshot | `quantity`, `product_id`, `order_id` | `idx_order_items_product`, `idx_order_items_order` |
| Latest Orders | `orders` ordered by `placed_at desc` limit N (default 5), with items | `placed_at` | `idx_orders_placed_at` (desc) |
| Latest Customers | `users` where `role = 'customer'` ordered by `created_at desc` limit N (default 5) | `created_at` | (none; seq scan fine) |
| Sales trend (monthly) | Group orders by month of `placed_at` for the last N months (default 6), revenue = `SUM(grand_total)` excluding cancelled/refunded; **zero-fill** months with no orders | `placed_at`, `grand_total`, `status` | `idx_orders_placed_at` |
| Recent Activity | Derived, no activity table exists — built from real events: latest orders placed (type `order`), latest products updated by `updated_at` (type `update`), low-stock alerts (type `product`) | `placed_at`, `updated_at` | above indexes |

**Definitional decisions (documented, configurable in one constant):**
- **Revenue excludes cancelled and refunded orders.** Alternative (revenue = `SUM` where `payment_status = 'paid'`) is stricter but empty today since payments are recorded, not collected. The fulfilment-status rule is chosen; it is a single WHERE clause either way.
- **LOW_STOCK_THRESHOLD = 10** (matches the mock data's "running out" feel; products with 4–9 units were listed). Exposed as an allowlisted query param with a default.
- **Counts include inactive customers/products where the metric asks for them** (Hidden Products = inactive by definition; Active Products excludes them).

### 3.3 Indexes already available

`idx_orders_status`, `idx_orders_payment_status`, `idx_orders_placed_at (desc)`, `idx_orders_user`, `idx_order_items_order`, `idx_order_items_product`, `idx_products_active`, `idx_products_category`, unique `order_number`, unique `users.email`. All dashboard queries are served by existing indexes; two reads (`users.role`, `products.stock_quantity`) use a sequential scan that is negligible at current volume (15 products, handful of users/orders).

### 3.4 Migration required?

**No.** Every metric is computed from existing columns with existing indexes. No new table, column, view, or index is required to deliver the feature.

Optional, **deferred** (explicitly NOT part of this sprint — only revisit if data grows): a partial index on `users(created_at) where role = 'customer'`, a partial index on `products(stock_quantity) where is_active`, a composite `(status, grand_total)` index for revenue, or a materialized SQL view `v_dashboard_summary` if the dashboard becomes slow at 100k+ rows. Adding any of these is a migration the user must approve separately.

---

## 4. Architecture Plan

Follows the proven layered stack exactly — **no shortcuts**.

```
routes/dashboard.routes.js
        |
        v
controllers/dashboard.controller.js   (thin; parses req, shapes { success, ... })
        |
        v
services/dashboard.service.js        (business logic: metric math, normalization,
        |                             trend zero-fill, activity derivation; toDbError)
        v
repositories/dashboard.repository.js (getSupabase + envelope; no error objects leak)
        |
        v
Supabase (PostgREST, service-role key, RLS-bypassed like every other repo)
```

Design rules:

1. **One router module** mounted at `apiRouter.use('/admin/dashboard', dashboardRoutes)` in `routes/index.js`. Every route gets `authorize('admin')` (the router-level `router.use(authorize('admin'))`, exactly like `adminOrder.routes.js`).
2. **One repository** (`dashboard.repository.js`) exposing focused, single-purpose queries that return the shared envelope. It imports `ORDER_WITH_ITEMS` and `PRODUCT_COLUMNS` from the existing repositories rather than re-declaring projections (single source of truth).
3. **One service** (`dashboard.service.js`) that composes the queries into the aggregate payload, reuses `normalizeOrder`, `normalizeProduct`, `normalizeCustomer`, and `adminOrderFor`, and computes the metric math (counts, revenue, deltas, monthly zero-fill, best-seller aggregation, activity derivation).
4. **One controller** (`dashboard.controller.js`) with one handler per endpoint; each calls the matching service function and responds `res.json({ success: true, ... })`.
5. **One validator** (`dashboard.validator.js`) allowlisting every query param (`limit`, `threshold`, `months`, `period`) with defaults, mirroring `adminOrder.validator.js` (combined 400 message).
6. The aggregate endpoint composes the **same service functions** the granular endpoints use — no duplicated calculation paths, so numbers can never disagree between `/admin/dashboard` and `/admin/dashboard/recent-orders`.
7. No new `server.js` or bootstrap changes beyond the one-line router registration. The 401-interceptor / auth middleware behavior is untouched.

---

## 5. Backend APIs

All under `/api/admin/dashboard`, all guarded by `authorize('admin')` (mounted behind the existing `verifyToken` chain). Response envelope follows the admin convention: `{ success: true, ... }`. Numeric values are returned raw (not pre-formatted); formatting stays in the frontend via `utils/format.js`. Dates are ISO-8601 UTC.

### 5.1 Aggregate — `GET /api/admin/dashboard`

Single round-trip that loads the whole page. Response:

```json
{
  "success": true,
  "stats": {
    "totalRevenue": 486000,
    "revenueChangePercent": 12.5,
    "totalOrders": 42,
    "ordersChangePercent": 8.2,
    "totalProducts": 15,
    "productsChangePercent": 3.4,
    "totalCustomers": 9,
    "customersChangePercent": 5.1,
    "pendingOrders": 3,
    "deliveredOrders": 31,
    "cancelledOrders": 2,
    "activeProducts": 12,
    "hiddenProducts": 3,
    "lowStockProducts": 2
  },
  "salesOverview": [
    { "month": "Mar", "revenue": 71200, "orders": 6 }
  ],
  "recentOrders": [
    { "id": "...", "orderNumber": "US-20260815-E45518B3", "customer": "Sprint Fixture",
      "grandTotal": 1299, "status": "pending", "paymentStatus": "pending",
      "placedAt": "2026-08-15T10:12:00.000Z", "items": [ ... ] }
  ],
  "lowStockProducts": [
    { "id": "...", "name": "...", "category": "T-Shirts", "stock": 3, "imageUrl": "https://..." }
  ],
  "recentActivity": [
    { "type": "order", "title": "Customer placed order", "detail": "US-... · ₹1,299", "time": "2026-08-15T10:12:00.000Z" }
  ],
  "bestSellers": [
    { "productId": "...", "name": "...", "quantity": 24 }
  ],
  "latestCustomers": [
    { "id": "...", "firstName": "...", "lastName": "...", "email": "...", "createdAt": "..." }
  ]
}
```

### 5.2 Granular endpoints (same service functions; enable future Analytics/Customers pages, verified reusable)

| Endpoint | Params (allowlisted) | Returns |
|---|---|---|
| `GET /api/admin/dashboard/stats` | none | `stats` object + `salesOverview` (last 6 months) |
| `GET /api/admin/dashboard/sales` | `months` (default 6, max 24) | `salesOverview` array (`month`, `revenue`, `orders`), zero-filled |
| `GET /api/admin/dashboard/recent-orders` | `limit` (default 5, max 20) | `recentOrders` (normalized admin-order shape, items embedded via `ORDER_WITH_ITEMS`) |
| `GET /api/admin/dashboard/low-stock` | `threshold` (default 10), `limit` (default 5, max 50) | `lowStockProducts` (active only, ascending stock) |
| `GET /api/admin/dashboard/best-sellers` | `limit` (default 5, max 20) | `bestSellers` (non-cancelled/refunded orders only) |
| `GET /api/admin/dashboard/customers` | `limit` (default 5, max 20) | `latestCustomers` (customer role, `createdAt` desc) |

### 5.3 Percentage-change (card hints) definition

Each stat card's `XChangePercent` = growth vs the **previous full month** (not all-time), matching the mock's "vs last month" hint:
- Revenue: `(this month revenue - last month revenue) / last month revenue * 100`
- Orders: month-over-month order count
- Products: month-over-month products created (`created_at`)
- Customers: month-over-month customers created (`created_at`)

When the previous month had zero baseline (e.g. a new store), return `null` and the frontend renders the card's neutral state instead of a bogus `∞%`.

---

## 6. Frontend Audit

### 6.1 Service layer

New `admin-frontend/src/services/dashboard.service.js`, mirroring the existing service modules:

- Uses the shared `api` axios instance (JWT interceptor + 401 auto-logout already wired — no change).
- `getDashboard()` -> `GET /admin/dashboard`, returns the aggregate payload.
- `getSalesOverview(months)`, `getRecentOrders(limit)`, `getLowStock(threshold, limit)`, `getBestSellers(limit)`, `getLatestCustomers(limit)` for the granular endpoints.
- Normalizes response shapes defensively (maps `orderNumber`/`grandTotal`/`placedAt` -> display fields) so components never parse raw API responses.

### 6.2 Page data-flow (mirrors `OrdersPage.jsx` exactly)

`DashboardPage.jsx` switches from static imports to a `useState` + `useEffect` fetch with the established lifecycle:

- `loadState: 'loading' | 'ready' | 'error'` plus a `requestIdRef` stale-response guard (same pattern as `OrdersPage.jsx`).
- On `loading`: skeleton blocks in the stat grid and section placeholders (new classes in `DashboardPage.module.css`, keeping the existing grid layout).
- On `error`: the existing `EmptyState` + `Try Again` button pattern already used across the admin UI; no custom error UI.
- On `ready`: render the live payload; **zero state** (e.g. no orders yet, no products) renders as clean zeros/empty lists — no mocked fallbacks.

### 6.3 Component changes (same DOM/CSS, props only)

| Component | Change |
|---|---|
| `StatCard` | **None** — already prop-driven. Page maps `stats` -> `{ label, value, percentage, hint, trend, accent }` with the exact current icons. |
| `SectionCard` | **None** — pure container. |
| `ActivityItem` | **None** — already prop-driven. Page maps `recentActivity` items to `{ type, title, detail, time }` (type map already exists). |
| `SalesChart.jsx` | Accept `data` (the `salesOverview` array) via props instead of importing the mock. Tooltip/formatters unchanged. |
| `RecentOrders.jsx` | Accept live orders via props (normalized admin-order shape); format with `utils/format.js` (`formatMoney`, `formatDate`) and reuse `ORDER_STATUS_META`/`PAYMENT_STATUS_META` from `utils/orderStatus.js`. |
| `LowStockList.jsx` | Accept live products via props (`{ id, name, category, stock, image }` display shape); unchanged markup. |
| `QuickActions.jsx` | Move the `quickActions` static config **into this component** (it is nav config, not business data); delete the mock import. |

### 6.4 `utils/format.js` and `utils/orderStatus.js`

Reuse the existing `formatMoney`, `formatDate`, `formatDateTime`, `formatCount`. Add **one** small helper `timeAgo(iso)` (e.g. "2 min ago", "3 hrs ago") for `recentActivity` — the mock used relative times and this preserves the design.

### 6.5 What is deleted / untouched

- **Deleted:** `admin-frontend/src/data/dashboard.js` (the entire mock file) and the `data/` directory if it becomes empty.
- **Untouched:** all layout components, `AppRoutes.jsx`, `ProtectedRoute`, `AdminLayout`, `Sidebar`, `useAuth`, `api.js`, all other pages (Orders, Products), and every shared util except the one added `timeAgo` helper.

---

## 7. Files — Create / Modify / Never touch

### Create (new files)

| File | Purpose |
|---|---|
| `backend/repositories/dashboard.repository.js` | Envelope queries: stats (revenue + counts), monthly sales, low stock, best sellers, latest orders (with `ORDER_WITH_ITEMS`), latest customers |
| `backend/services/dashboard.service.js` | Metric math, zero-fill, deltas, activity derivation; reuses `normalizeOrder`/`normalizeProduct`/`normalizeCustomer`; `toDbError()` mapping |
| `backend/controllers/dashboard.controller.js` | Thin handlers -> `{ success: true, ... }` |
| `backend/routes/dashboard.routes.js` | `router.use(authorize('admin'))` + the 7 routes (aggregate + 6 granular) |
| `backend/validators/dashboard.validator.js` | Allowlisted query params (`limit`, `threshold`, `months`), defaults, combined 400 |
| `admin-frontend/src/services/dashboard.service.js` | API client (aggregate + granular) on the shared `api` instance |

### Modify (existing files)

| File | Change |
|---|---|
| `backend/routes/index.js` | One line: mount `dashboardRoutes` at `/admin/dashboard` |
| `admin-frontend/src/pages/Dashboard/DashboardPage.jsx` | Fetch + render live payload (loadState lifecycle, stats mapping, prop wiring) |
| `admin-frontend/src/pages/Dashboard/DashboardPage.module.css` | Add skeleton/loading/empty classes (keep existing grid layout) |
| `admin-frontend/src/components/dashboard/SalesChart.jsx` | `data` via props; drop mock import |
| `admin-frontend/src/components/dashboard/RecentOrders.jsx` | Live orders via props; format with `utils/format.js`/`orderStatus.js` |
| `admin-frontend/src/components/dashboard/LowStockList.jsx` | Live products via props; drop mock import |
| `admin-frontend/src/components/dashboard/QuickActions.jsx` | Absorb the static `quickActions` config; drop mock import |
| `admin-frontend/src/utils/format.js` | Add `timeAgo(iso)` helper (only addition) |

### Delete

| File | Reason |
|---|---|
| `admin-frontend/src/data/dashboard.js` | Entire mock source; nothing else imports it after the above |

### Never touch

- **Customer-facing frontend** (`storefront/`) — entirely out of scope.
- **Backend customer modules:** `customer/auth`, `customer/cart`, `customer/orders`, `customer/addresses`, `order`/`cart`/`checkout` — untouched.
- **Razorpay / payment handling** and any code handling money at the edge (payment method, pricing validator).
- **Auth/security:** `middleware/auth.middleware.js`, login flow, `/auth/me`, 401 interceptor — the Sprint 22.2 work must not alter the just-fixed admin session handling (`da6c089`).
- **Schema/migrations:** no migration is required (see §3.4); do not add one.
- **Existing admin features:** Products and Orders pages, all their components, and all Sprint 20–22.1 files.
- `SPRINT_21_3_AUDIT.md` and prior audit docs.

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| N+1 queries on recent orders (per-order item fetch) | Low | High | Use the existing `ORDER_WITH_ITEMS` embedded projection — one round-trip; do not loop items. |
| Large row sets slow JS-side aggregation | Low (15 products / few orders today) | Med | Keep queries column-scoped (only needed columns); document the deferred SQL-view path in §3.4. Never fetch full product/order rows for counts. |
| Duplicate calculation paths diverge between aggregate and granular endpoints | Med | Med | Aggregate calls the *same* service functions the granular endpoints expose — single source of truth. |
| Stale data perception on refresh | Low | Low | Optional in-process TTL cache at the service layer (e.g. 30s) if needed; measure first, ship without it. |
| Regressions in just-fixed admin auth | Med | High | Dashboard is covered by the existing `admin-ui-test.mjs` Dashboard render step + full auth suite re-run (see §9). Do not modify `auth.middleware.js` or `api.js`. |
| Broken formatting vs mock (₹, dates) | Med | Low | Reuse `formatMoney`/`formatDate`/`orderStatus` meta; keep the exact mock display strings so visuals don't shift. |
| Recent Activity feels fabricated (no activity table) | Med | Low | Derive strictly from real order/update/low-stock events; document the mapping in code comments and this audit. |
| Zero-data states look empty/broken | Med | Low | Render clean zeros + EmptyState, never fall back to mock numbers. |
| Scope creep into Analytics/Customers pages | Med | Low | Those pages are explicitly out of scope; only the granular API endpoints (shared by the aggregate) are built. |

---

## 9. Verification Plan

Run in this order against the running stack (backend `:3001`, admin dev `:5174`).

### 9.1 Backend unit-level (via direct HTTP)

1. `GET /api/admin/dashboard` without a token -> `401`.
2. `GET /api/admin/dashboard` with the admin token -> `200 { success: true, ... }`; validate the **exact** payload shape (all keys in §5.1 present, correct types).
3. **Accuracy spot-check:** independently count via a Supabase client query (service role) and compare to the API's `totalOrders`, `totalProducts`, `totalCustomers`, `totalRevenue`, `pendingOrders`, `lowStockProducts`. Must match.
4. Granular endpoints: `sales?months=6` (zero-filled months present), `recent-orders?limit=5`, `low-stock?threshold=10`, `best-sellers`, `customers` — each `200` and consistent with the aggregate.
5. Invalid params (`limit=9999`, `months=abc`) -> `400` with combined message.

### 9.2 Frontend build/lint

1. `npm run build` in `admin-frontend` — clean build (this catches the removed mock imports).
2. Existing lint script passes.

### 9.3 Browser E2E (CDP harness, same pattern as `audit-auth.mjs` / `admin-ui-test.mjs`)

1. Login as admin -> Dashboard renders.
2. **Live-data proof:** the card values and Recent Orders rows match the current database state (compare against the known fixture order `US-20260815-E45518B3` and 15 products). Refresh -> values persist (no mock reset).
3. No `[object Object]`, no `NaN`, no `₹undefined` anywhere; console has zero errors/warnings.
4. Zero-state: verify rendering path with an empty query result (temporarily filterable) shows clean zeros/empty lists.
5. Unauthorized: clearing the token mid-session -> existing 401 auto-logout still works (regression).
6. Navigation: sidebar Dashboard link still highlights; page is responsive at the same breakpoints.

### 9.4 Full regression suite (no behavior change)

- Re-run `audit-auth.mjs` (30 checks) — auth still green.
- Re-run `admin-ui-test.mjs` (15 checks, now searches `US-20260815-E45518B3`) — dashboard render step now validates live data.
- Re-run Products CRUD (`crud-products.mjs`, 12 checks) and storefront smoke (`storefront-smoke.mjs`, 10 checks).
- Backend regression: run existing backend test/check command.

### 9.5 Git / hygiene

- `git status --short` shows only the intended create/modify/delete files (no stray changes, no secrets, no temp scripts committed).
- Confirm `admin-frontend/src/data/dashboard.js` is deleted and nothing imports it.

### 9.6 Manual QA checklist

- Stat cards show `₹`-formatted money, order counts, product counts, customer counts with sane percentage hints.
- Chart shows real monthly revenue, zero-filled months present, tooltips format `₹`.
- Recent Orders shows real orders (order number clickable to `/orders` if already wired) with correct status pills.
- Low Stock list shows only active products at/below threshold, ascending stock.
- Recent Activity shows derived real events with relative times.
- Refresh and hard-reload are stable; slow network shows skeletons, failure shows Try Again.

---

## 10. Phased Implementation Roadmap

Each phase is independently verifiable and commits separately. No commit happens until the user approves the audit and each phase.

| Phase | Work | Verify with |
|---|---|---|
| P1 | Backend `dashboard.repository.js` + `dashboard.service.js` | §9.1 accuracy spot-check (direct Supabase count comparison) |
| P2 | `dashboard.validator.js`, `dashboard.controller.js`, `dashboard.routes.js`, mount in `routes/index.js` | §9.1 full (401, shape, granular, 400s) |
| P3 | Frontend `dashboard.service.js` + `DashboardPage` stats wiring + `timeAgo` | §9.2 build + §9.3 live-value proof for cards |
| P4 | `RecentOrders` + `LowStockList` prop adoption, `QuickActions` config absorb | §9.3 rows vs DB + zero console errors |
| P5 | `SalesChart` prop adoption + recent-activity derivation | §9.3 chart + §9.6 manual chart QA |
| P6 | Loading/error/skeleton states, delete `data/dashboard.js`, build + lint | §9.2, §9.3 (loading/error paths), §9.5 |
| P7 | Full regression: auth suite, admin UI suite, products CRUD, storefront, backend checks | §9.4 all green |
| P8 | Final review, `git status` hygiene, commit (only if user approves) | §9.5 |

**Estimated surface:** ~6 new backend files, ~1 new frontend file, ~8 modified, 1 deleted, 0 migrations. This is a contained wiring sprint; the design, styling, architecture, and security model are all unchanged.

---

*End of Sprint 22.2 audit. Awaiting approval before any implementation.*