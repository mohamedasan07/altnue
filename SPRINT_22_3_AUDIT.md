# Sprint 22.3 — Audit Only: Admin Customers Module

**Status:** Planning / Audit complete — NO code written, modified, or committed.
**Scope:** A read-only, admin-only Customers module (list + detail) for the existing UNSORTED admin dashboard. No write endpoints. No migrations.
**Base commit:** `da6c089` ("fix: validate admin session and handle unauthorized access") — Sprint 22.2 fully shipped and verified.

This document audits the current architecture and produces the implementation plan. It mirrors the depth of `SPRINT_22_1_AUDIT.md` and `SPRINT_22_2_AUDIT.md`.

---

## 1. Current Customer Architecture

### 1.1 Admin frontend Customers page (currently a placeholder)

| Item | Location | Current state |
|---|---|---|
| Page | `admin-frontend/src/pages/Customers/CustomersPage.jsx:1-5` | `function CustomersPage() { return <h1>Customers</h1> }` — pure placeholder. No CSS module, no components, no service call. |
| Route | `admin-frontend/src/routes/AppRoutes.jsx:39` | `/customers` → `<CustomersPage />`, already nested inside `<ProtectedRoute>` → `<AdminLayout>` (L34-35). **No route change needed.** |
| Nav | `admin-frontend/src/components/layout/Sidebar.jsx:20` | `{ label: 'Customers', to: '/customers', icon: FiUsers }` — already wired and active-styled (L45-47). **No sidebar change needed.** |
| Layout | `admin-frontend/src/layouts/AdminLayout.jsx:7-32` | Renders `Sidebar` + `Topbar` + `<Outlet />` inside `<main className={styles.content}>`. The Customers page mounts through the existing outlet. **No layout change needed.** |

### 1.2 Backend customer-related modules (complete inventory)

All customer data is owned by the **customer auth / profile / address / order** stack (Sprint 21.x). Every repository returns the uniform envelope `{ ok: true, data, [count] } | { ok: false, reason, [code] }`; services return domain-shaped objects or throw `ApiError`; controllers respond `{ success: true, ... }`.

| Layer | File | What it provides (customer-relevant) |
|---|---|---|
| Repository | `backend/repositories/user.repository.js` | `USER_SAFE_COLUMNS` (L19-30: `id, email, first_name, last_name, phone, avatar_url, role, is_active, last_login_at, created_at`); `USER_AUTH_COLUMNS` (L33-45); `findUserById(id)` (L88-100); `findUserByEmail`, `insertUser`, `updateUserProfile` (L110-123, email/role immutable), `touchLastLogin(id)` (L130-141 — **lastLogin IS tracked**), password-reset fns (L157-207). **`USER_SAFE_COLUMNS` is a module-private `const` — not exported.** |
| Repository | `backend/repositories/address.repository.js` | `ADDRESS_COLUMNS` (L14-27); **`findAllByUser(userId)` (L33-45)** — `.select(ADDRESS_COLUMNS).eq('user_id', userId).order('created_at', asc)`, exported and ownership-scoped purely by `user_id` → **directly reusable for the admin detail**; plus CRUD + default management (L52-191). |
| Repository | `backend/repositories/order.repository.js` | **`ORDER_WITH_ITEMS` (L57-71, exported)** — orders with embedded `items:order_items(...)`; **`findOrdersByUser(userId)` (L77-89)** — unpaged customer order list by `user_id`; `findOrderById`, `insertOrder`, `insertOrderItems`, etc. |
| Repository | `backend/repositories/adminOrder.repository.js` | **`findAllOrders(options)` (L38-64)** — the canonical admin list template: `.select(ORDER_WITH_ITEMS, { count: 'exact' }).range(offset, offset+limit-1)` + conditional `.eq` filters + `.ilike` search + `.order(sort, ascending)`; `findOrderByIdAdmin(id)` (L71-83, no ownership scope); status/payment updaters (L93-128). |
| Repository | `backend/repositories/dashboard.repository.js` | `fetchCustomerStatsRows()` (L63-75) — `.select('created_at', {count:'exact'}).eq('role','customer').range(...FULL_SCAN)`; **`fetchLatestCustomers(limit)` (L179-192)** — newest customers via `USER_SAFE_COLUMNS`-equivalent projection, `.eq('role','customer')`, order `created_at desc`, range. `FULL_SCAN = [0, 99999]` (L22) documents the PostgREST 1000-row cap workaround. |
| Service | `backend/services/customerAuth.service.js` | **`normalizeCustomer(row)` (L50-63, EXPORTED)** — `{ id, email, firstName, lastName, phone, avatarUrl, role, isActive, createdAt, lastLoginAt }` (no `updatedAt`); `registerCustomer` (L87-111), `loginCustomer` (L124-144, calls `touchLastLogin`), `getCurrentCustomer` (L153-158), `signCustomerToken` (L66-78). |
| Service | `backend/services/user.service.js` | `getProfile` (L34-39), `updateProfile` (L49-58) — customer profile via `normalizeCustomer`. |
| Service | `backend/services/address.service.js` | `normalizeAddress` (L40-55, module-local) → `{ id, name, phone, address, city, state, pincode, country, isDefault, createdAt, updatedAt }`; `listAddresses` (L75-79); `toDbError` pattern (L28-37). |
| Service | `backend/services/order.service.js` | **`normalizeOrder(row)` (L93-153, EXPORTED)** — full public order shape (orderNumber, status, paymentStatus, paymentMethod, totals, currency, shipping, contact, items, placedAt...); `listOrders(userId)` (L160-164) via `findOrdersByUser`; `getOrder(userId, orderId)` (L173-179); `placeOrder` (L194-357, idempotent, CAS stock, rollback). |
| Service | `backend/services/adminOrder.service.js` | **`adminOrderFor(row)` (L44-50)** — `{ ...normalizeOrder(row), createdAt, updatedAt }` (the "admin superset of a public normalize" pattern to copy); **`listAdminOrders(query)` (L57-84)** — parse → offset → `findAllOrders` → map → `{ orders, pagination: { page, limit, total, totalPages: max(1, ceil(total/limit)) } }`; `getAdminOrder` (L93-99); `toDbError` (L29-34). |
| Service | `backend/services/dashboard.service.js` | `EXCLUDED_SALE_STATUSES = ['cancelled','refunded']` (L39); `totalCustomers` (L168) = `customerRows.length`; **`getRecentActivity()` (L283-328)** — derived activity feed (orders/product updates/low-stock → `{type,title,detail,time}`, sorted desc, capped) — the pattern for per-customer activity; `getLatestCustomers` (L271-276) reuses `normalizeCustomer`. |
| Validator | `backend/validators/adminOrder.validator.js` | **`parseAdminOrderQuery` (L50-98)** — the canonical query parser: `page` (int ≥1), `limit` (1-100, default 20), `search` (trim, slice ≤64), status/paymentStatus allowlists (L17-27), `ORDER_SORTS` (L29), `order` asc/desc, combined `ApiError(400, errors.join('; '))`. |
| Validator | `backend/validators/user.validator.js` | `validateRegisterPayload` (L54-119), `validateLoginPayload`, `validateProfilePayload` (L205-268, rejects email/role changes). Body-only. |
| Validator | `backend/validators/address.validator.js` | `validateAddressPayload` (L32-115); `PHONE_RE`, country allowlist (L23). Body-only. |
| Validator | `backend/validators/order.validator.js` | `parseOrderId` (UUID) (L61-67); `validateOrderPayload` (L114-246). |
| Validator | `backend/validators/dashboard.validator.js` | `parseDashboardQuery` (L27-54): `limit`/`threshold`/`months` allowlist. |
| Controller | `backend/controllers/adminOrder.controller.js` | `listAdminOrdersHandler` (L16-19): `res.json({ success: true, orders, pagination })`. The response template. |
| Controller | `backend/controllers/dashboard.controller.js` | `getDashboardHandler` (L20-23), `getLatestCustomersHandler` (L56-59). |
| Routes | `backend/routes/adminOrder.routes.js:24` | `router.use(authorize('admin'))` then `GET /`, `GET /:id`, `PATCH ...`. |
| Routes | `backend/routes/dashboard.routes.js:32,40` | `authorize('admin')`; `GET /customers` → latest customers (the only customer-adjacent admin endpoint today). |
| Routes | `backend/routes/index.js:13,32` | All routers registered here: `/admin/orders` (L31), `/admin/dashboard` (L32). A new `customerRoutes` mounts beside them. |
| Middleware | `backend/middleware/auth.middleware.js` | `authenticate` (L22-53) attaches `req.admin = { id, name, email, role }` for admins; `authorize(...roles)` (L67-83) throws 403 on mismatch; `verifyAdmin` (L90-92). |

### 1.3 Existing customer auth / profile / address / order code — what already exists to reuse

- **Auth:** `POST/GET` register, login, `GET /api/customer/auth/me`, forgot/reset password. Customer JWT carries `{ id, email, firstName, lastName, role }`, `expiresIn '7d'`.
- **Profile:** `GET/PUT /api/customer/profile` (`user.routes.js`), immutable email/role, re-signs token after edits.
- **Addresses:** `GET/POST/PUT/DELETE /api/customer/addresses`, single-default invariant enforced by DB partial unique index.
- **Orders:** `GET /api/customer/orders` (unpaged, by `user_id`), `GET /api/customer/orders/:id`, checkout placement with idempotency.
- **Admin side:** order list/detail/status/payment (Sprint 22.1), dashboard stats + latest customers + activity (Sprint 22.2).

**Identified reusable items (with locations):**

| Reuse | Location | Notes |
|---|---|---|
| `normalizeCustomer` (profile shape) | `customerAuth.service.js:50` | Exported. Admin detail can extend it. |
| `normalizeOrder` + `ORDER_WITH_ITEMS` | `order.service.js:93` / `order.repository.js:57` | Customer order rows for the detail drawer. |
| `findAllByUser` (addresses) | `address.repository.js:33` | Admin-safe (filters purely by `user_id`). |
| `findAllOrders` (list template) | `adminOrder.repository.js:38` | Range + exact count + allowlisted sort + filters. |
| `adminOrderFor` (admin superset pattern) | `adminOrder.service.js:44` | The exact shape to mirror as `adminCustomerFor`. |
| `listAdminOrders` (pagination math) | `adminOrder.service.js:57` | `totalPages = max(1, ceil(total/limit))`. |
| `parseAdminOrderQuery` (query parser) | `adminOrder.validator.js:50` | Copy for `parseAdminCustomerQuery`. |
| `toDbError` pattern | `adminOrder.service.js:29`, `address.service.js:28` | Uniform 500 mapping. |
| `EXCLUDED_SALE_STATUSES` + activity feed | `dashboard.service.js:39,283` | Revenue exclusions + derived-activity pattern. |
| `authorize('admin')` router guard | `adminOrder.routes.js:24`, `dashboard.routes.js:32` | Standard admin mount. |
| `ApiError`, `asyncHandler` | `utils/apiError.js`, `utils/asyncHandler.js` | Standard error plumbing. |

**Gaps (nothing to reuse yet — must be built):**
- No `GET /api/admin/customers` list endpoint (verified: no `findAllCustomers`/`adminCustomer` anywhere).
- No per-customer aggregates (order count / lifetime spend / AOV) — must add a scoped order-stats query.
- `USER_SAFE_COLUMNS` is not exported — a tiny export addition (or a local admin projection that adds `updated_at`) is needed.
- `normalizeCustomer` omits `updatedAt` — the admin superset must add it (mirroring `adminOrderFor`).

---

## 2. Database Audit

All from `backend/database/schema.sql` (mirrored by migrations `001_initial_schema.sql`, `002_customer_auth.sql`, `003_addresses.sql`). All tables have RLS **enabled**; the backend writes/reads with the **service-role key, which bypasses RLS** (`database/client.js:15-34`) → an admin module can read every customer row regardless of the `users_select_own` policy (`schema.sql:250-259`).

### 2.1 `users` — `schema.sql:70-87`

```
id uuid PK default gen_random_uuid()
email citext NOT NULL UNIQUE
password_hash text NOT NULL
first_name text | last_name text | phone text | avatar_url text
role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin'))
is_active boolean NOT NULL DEFAULT true
last_login_at timestamptz
reset_token text | reset_token_expires_at timestamptz   (Sprint 21.1)
created_at timestamptz NOT NULL DEFAULT now()
updated_at timestamptz NOT NULL DEFAULT now()
```

- **`last_login_at` IS tracked** (`touchLastLogin` on every login, `user.repository.js:130`).
- `updated_at` exists (auto-refreshed by `trg_users_updated_at`, `schema.sql:214`) but is absent from `USER_SAFE_COLUMNS`/`normalizeCustomer`.
- Indexes: only the partial `idx_users_reset_token` (`schema.sql:204`). No index on `(role)` or `(created_at)` — fine at current scale (2 customers); optional later (see §8).

### 2.2 `addresses` — `schema.sql:92-105`

```
id uuid PK | user_id uuid FK → users.id ON DELETE CASCADE
name, phone, address, city, state, pincode, country (DEFAULT 'India')
is_default boolean NOT NULL DEFAULT false
created_at, updated_at
```
- Index `idx_addresses_user (user_id)` (`schema.sql:191`).
- Partial unique `idx_addresses_one_default` (`schema.sql:286-288`) — exactly one default per user.

### 2.3 `orders` — `schema.sql:148-170`

```
id uuid PK | user_id uuid FK → users.id ON DELETE SET NULL
order_number text NOT NULL UNIQUE
status text CHECK (pending|confirmed|processing|shipped|delivered|cancelled|refunded)
payment_status text CHECK (pending|paid|failed|refunded)
payment_method text
subtotal | discount | shipping | tax | grand_total  numeric(12,2) ≥ 0
currency text DEFAULT 'INR' | coupon_code text
shipping_address jsonb | contact jsonb     (snapshots)
placed_at timestamptz NOT NULL DEFAULT now()
created_at, updated_at
```
- Indexes: `idx_orders_user (user_id)`, `idx_orders_status`, `idx_orders_payment_status`, `idx_orders_placed_at (placed_at desc)` (`schema.sql:197-200`) — **per-customer order queries and the placed_at sort are covered.**

### 2.4 `order_items` — `schema.sql:172-184`

```
id uuid PK | order_id uuid FK → orders.id ON DELETE CASCADE
product_id bigint FK → products.id ON DELETE SET NULL
name text | price_at_order numeric(12,2) | image_url text
size | color | color_name | quantity int > 0 | created_at
```
- Indexes: `idx_order_items_order (order_id)`, `idx_order_items_product` (`schema.sql:201-202`).

### 2.5 Verdict — everything required already exists

| Requirement | Source | Present? |
|---|---|---|
| Profile fields (id, avatar, name, email, phone, role, status, memberSince, lastLogin) | `users` | ✅ (status is derived from `is_active`; no separate `status` column and none is needed) |
| `totalOrders` / `totalSpent` / `averageOrderValue` | derived from `orders.grand_total/status` by `user_id` | ✅ (computed; no materialized column) |
| Customer addresses | `addresses` by `user_id` | ✅ |
| Customer orders (+ items) | `orders` + `order_items` via `ORDER_WITH_ITEMS` | ✅ |
| Customer activity | derived (orders + addresses + `last_login_at`) | ✅ (no audit table; derive, see §3) |

**No migrations are required.** No schema, index, trigger, or RLS change is necessary for Sprint 22.3. The only future-oriented note (deferred, not required): a `users (role, created_at)` index if the customer base grows large — same category as the deferred view noted in `SPRINT_22_2_AUDIT.md:153`.

---

## 3. Customer Information Mapping

### 3.1 Customer Profile (list row + detail header)

| Spec field | Source (users column) | Normalized name (keep `normalizeCustomer` names) |
|---|---|---|
| id | `users.id` | `id` |
| avatar | `users.avatar_url` | `avatarUrl` |
| firstName | `users.first_name` | `firstName` |
| lastName | `users.last_name` | `lastName` |
| email | `users.email` | `email` |
| phone | `users.phone` | `phone` |
| memberSince | `users.created_at` | `createdAt` |
| lastLogin | `users.last_login_at` | `lastLoginAt` (null when never logged in) |
| role | `users.role` | `role` (always `'customer'` for this module's rows) |
| status | derived from `users.is_active` | `status: is_active ? 'active' : 'inactive'` (added by the admin superset — the DB has no `'blocked'` state; do not invent one) |
| updatedAt | `users.updated_at` | `updatedAt` (admin superset only) |

Implementation: `adminCustomerFor(row) = { ...normalizeCustomer(row), status: row.is_active ? 'active' : 'inactive', updatedAt: row.updated_at ?? null }`. Because `normalizeCustomer` is exported and returns `isActive`, the admin shape adds exactly two fields. Requires `updated_at` in the admin projection.

### 3.2 Customer Statistics (detail only)

All derived in one scoped query (`select('status, grand_total').eq('user_id', userId)`) — no N+1, no full scan (per-user rows are naturally bounded):

| Spec field | Derivation |
|---|---|
| `totalOrders` | count of all that customer's order rows |
| `totalSpent` | `sum(grand_total)` **excluding** `status IN ('cancelled','refunded')` — reuse `EXCLUDED_SALE_STATUSES` from `dashboard.service.js:39` so the admin number always matches the dashboard revenue definition |
| `averageOrderValue` | `totalSpent / max(1, saleOrderCount)` where `saleOrderCount` = rows not in the excluded set — guard against `0/0` |

When a customer has no orders: `{ totalOrders: 0, totalSpent: 0, averageOrderValue: 0 }`.

### 3.3 Customer Addresses (detail only)

`addresses` where `user_id = :id`, ordered `created_at asc` (reuse `address.repository.findAllByUser`), each row shaped by the existing `normalizeAddress` shape `{ id, name, phone, address, city, state, pincode, country, isDefault, createdAt, updatedAt }`. Empty array when none.

### 3.4 Customer Orders (detail only)

`orders` where `user_id = :id`, embedded `order_items` via the existing `ORDER_WITH_ITEMS` projection, ordered `placed_at desc`, paginated with `range + { count: 'exact' }` (default limit 10). Rows shaped by `normalizeOrder` (already exported). Includes per-order `status`/`payment_status` for the admin badges.

### 3.5 Customer Activity (detail only — derived, no new table)

There is no activity-log table. Derive a bounded feed (cap 10, sorted `time desc`) from data already fetched in the detail (so **zero extra queries**), using the exact `{ type, title, detail, time }` shape from `dashboard.service.js:295-321`:

| Event | type | title | detail | time |
|---|---|---|---|---|
| Order placed | `order` | `Order placed` | `order_number · ₹grand_total` | `orders.placed_at` |
| Order status changed | `order_update` | `Order marked <status>` | `order_number` | `orders.updated_at` (only when `updated_at > placed_at`) |
| Address added | `address` | `Address added` | `city, state` | `addresses.created_at` |
| Account activity | `account` | `Account created` | `email` | `users.created_at` |
| Last login | `account` | `Last login` | — | `users.last_login_at` |

Sort desc and slice to 10, exactly like `getRecentActivity`. Activity, address, and order feeds each stay derivable from their own table — no joins needed beyond what `ORDER_WITH_ITEMS` already provides.

---

## 4. Backend Audit — Layered Design (Repository → Service → Controller → Routes)

Mirror the Sprint 22.1/22.2 layering exactly: repository envelope → service domain objects / `ApiError` → thin controller → `authorize('admin')` routes.

### 4.1 `backend/validators/customer.validator.js` (new)

- `CUSTOMER_SORTS = ['created_at', 'last_login_at', 'first_name', 'email', 'role']` — allowlist only.
- `CUSTOMER_STATUS_FILTERS = ['active', 'inactive']` → maps to `isActive` boolean for the repo.
- `parseAdminCustomerQuery(query)` — copy `parseAdminOrderQuery` (`adminOrder.validator.js:50-98`): `page` int ≥1 (default 1), `limit` 1–100 (default 20), `search` trim + slice ≤64, `status` allowlist, `sort` allowlist, `order` `asc|desc`. Returns `{ page, limit, search|null, isActive|null, sort, order }`. Throws `ApiError(400, errors.join('; '))` on any invalid input.
- `parseCustomerId(value)` — copy `parseOrderId` (`order.validator.js:61-67`): UUID check, else `ApiError(400, 'Invalid customer id')`.
- Reuses the existing `user.validator.js`/`address.validator.js` bodies where relevant — no duplication of payload rules (this module is read-only; payload validators are untouched).

### 4.2 `backend/repositories/customer.repository.js` (new)

Follow the envelope + `getSupabase()` first-guard pattern of every repository.

- **`CUSTOMER_ADMIN_COLUMNS`** — local admin projection. Recommend exporting `USER_SAFE_COLUMNS` from `user.repository.js:19` (single source of truth, minimal read-only change) and composing `CUSTOMER_ADMIN_COLUMNS = USER_SAFE_COLUMNS + updated_at`. If the export is preferred to be avoided, define the local constant instead — both acceptable; **export is preferred** to prevent column drift.
- **`findAllCustomers({ search, isActive, sort, order, offset, limit })`** — copy `findAllOrders` (`adminOrder.repository.js:38-64`):
  - `.select(CUSTOMER_ADMIN_COLUMNS, { count: 'exact' })`
  - `.eq('role', 'customer')` (the module is customers-only)
  - `.eq('is_active', isActive)` when set
  - `.or(\`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%\`)` when search set (PostgREST `or()` over the four text columns; values are parameterized — no injection surface)
  - `.order(sort, { ascending: order === 'asc' })` — allowlisted sort
  - `.range(offset, offset + limit - 1)`
  - Returns `{ ok: true, data, count }` (exact count **before** range).
- **`findCustomerById(id)`** — `.select(CUSTOMER_ADMIN_COLUMNS).eq('id', id).maybeSingle()` (mirror `findUserById` + admin scope).
- **`fetchCustomerOrderStats(userId)`** — `.select('status, grand_total').eq('user_id', userId)` (per-user; bounded; used for `totalOrders/totalSpent/AOV`).
- **`findCustomerOrders(userId, { offset, limit })`** — `.select(ORDER_WITH_ITEMS, { count: 'exact' }).eq('user_id', userId).order('placed_at', { ascending: false }).range(offset, offset+limit-1)` (reuse the exported `ORDER_WITH_ITEMS`).
- **Addresses:** reuse `address.repository.findAllByUser(userId)` (`address.repository.js:33`) directly — it is exported, ownership-scoped purely by `user_id`, and therefore admin-safe as-is. No duplicate address query in the new repository.

### 4.3 `backend/services/customer.service.js` (new)

- `toDbError(action, result)` — copy the pattern (`adminOrder.service.js:29-34`).
- **`adminCustomerFor(row)`** — `{ ...normalizeCustomer(row), status: row.is_active ? 'active' : 'inactive', updatedAt: row.updated_at ?? null }` (mirrors `adminOrderFor`). Imports `normalizeCustomer` from `customerAuth.service.js`.
- **`buildCustomerStats(orderRows)`** — pure function computing `{ totalOrders, totalSpent, averageOrderValue }` using `EXCLUDED_SALE_STATUSES` semantics (import the constant or replicate the 2-element list locally to avoid coupling — recommend importing the semantics; the dashboard definition is the source of truth).
- **`buildCustomerActivity({ profile, orders, addresses })`** — pure function producing the derived `{ type, title, detail, time }` feed (§3.5), sorted desc, capped at 10.
- **`listAdminCustomers(query)`** — `parseAdminCustomerQuery` → `offset = (page-1)*limit` → `findAllCustomers` → map `adminCustomerFor` → `{ customers, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } }` (copy `listAdminOrders` math).
- **`getAdminCustomer(id, orderQuery)`** — `parseCustomerId` → `findCustomerById`; if `!result.data` → `ApiError(404, 'Customer not found')`. Then `Promise.all([fetchCustomerOrderStats, findAllByUser, findCustomerOrders])` (constant 3 parallel queries — **no N+1**). Compose:
  ```
  { profile: adminCustomerFor(user),
    stats: buildCustomerStats(...),
    addresses: [...normalizeAddress rows],
    orders: { items: [...normalizeOrder rows], pagination: { page, limit, total, totalPages } },
    activity: buildCustomerActivity({ profile, orders, addresses }) }
  ```

### 4.4 `backend/controllers/customer.controller.js` (new)

- `listCustomersHandler` (L-style thin): `res.json({ success: true, customers, pagination })`.
- `getCustomerHandler`: `res.json({ success: true, profile, stats, addresses, orders, activity })`.
- Wrap in `asyncHandler`.

### 4.5 `backend/routes/customer.routes.js` (new)

- `router.use(authorize('admin'))` (mirror `adminOrder.routes.js:24`).
- `GET /` → `listCustomersHandler`; `GET /:id` → `getCustomerHandler`.
- Register in `backend/routes/index.js`: `import customerRoutes from './customer.routes.js'` + `apiRouter.use('/admin/customers', customerRoutes)` (beside L31-32).

**No write endpoints in Sprint 22.3.** No service writes, no controller mutations, no status/block toggling — read-only by design.

---

## 5. API Design (endpoints only)

### 5.1 `GET /api/admin/customers`

Query params (all optional): `page` (int ≥1, default 1) · `limit` (1–100, default 20) · `search` (≤64 chars, ILIKE over `first_name|last_name|email|phone`) · `sort` (`created_at|last_login_at|first_name|email|role`, default `created_at`) · `order` (`asc|desc`, default `desc`) · `status` (`active|inactive`, default none).

**Response** `200`:
```json
{
  "success": true,
  "customers": [
    {
      "id": "uuid",
      "avatarUrl": "https://...|null",
      "firstName": "string|null",
      "lastName": "string|null",
      "email": "string",
      "phone": "string|null",
      "role": "customer",
      "isActive": true,
      "status": "active",
      "createdAt": "iso",
      "lastLoginAt": "iso|null",
      "updatedAt": "iso|null"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
}
```

**Errors:** `400` invalid params (`ApiError(400, '...; ...')`); `401` missing/expired admin token; `403` non-admin.

### 5.2 `GET /api/admin/customers/:id`

**Response** `200`:
```json
{
  "success": true,
  "profile": { "id", "avatarUrl", "firstName", "lastName", "email", "phone", "role", "isActive", "status", "createdAt", "lastLoginAt", "updatedAt" },
  "stats": { "totalOrders": 2, "totalSpent": 6951, "averageOrderValue": 3475.5 },
  "addresses": [ { "id", "name", "phone", "address", "city", "state", "pincode", "country", "isDefault", "createdAt", "updatedAt" } ],
  "orders": {
    "items": [ { "id", "orderNumber", "status", "paymentStatus", "paymentMethod", "totals", "currency", "couponCode", "shipping", "contact", "delivery", "items", "placedAt", "createdAt", "updatedAt" } ],
    "pagination": { "page": 1, "limit": 10, "total": 2, "totalPages": 1 }
  },
  "activity": [ { "type": "order|order_update|address|account", "title": "string", "detail": "string", "time": "iso" } ]
}
```

**Errors:** `400` malformed id; `404` unknown customer; `401`/`403` auth.

No other endpoints. No POST/PUT/PATCH/DELETE in Sprint 22.3.

---

## 6. Frontend Audit

### 6.1 Reusable components (verified inventory)

| Component | File | Reuse for Customers |
|---|---|---|
| `Button` | `ui/Button.jsx` (`{variant, size, loading, disabled, ...}`) | Pagination, drawer actions, Try Again, Clear Filters |
| `Input` | `ui/Input.jsx` (`{label, icon, error, hint, ...}`) | Optional (search uses a custom input like `OrderSearch`) |
| `Card` | `ui/Card.jsx` | Sections inside the drawer |
| `EmptyState` | `ui/EmptyState.jsx` (`{icon, title, description, action}`) | Empty / error / no-results states |
| `Loader` | `ui/Loader.jsx` (`size`, `color`) | Inline loading |
| `Modal` | `ui/Modal.jsx` (`size='md'|'lg'`) | **The "drawer" mechanism** — `OrderDetailDrawer` is a `Modal size="lg"`. Use identically for `CustomerDetailDrawer`. |
| `StatCard` | `dashboard/StatCard.jsx` (`{ stat: {icon,label,value,percentage,hint,trend,accent} }`) | **Directly reusable** for `CustomerStatsCard` (3 stats) |
| `SectionCard` | `dashboard/SectionCard.jsx` (`{title, subtitle, action, children}`) | Drawer sections (Orders / Addresses / Activity) |
| `ActivityItem` | `dashboard/ActivityItem.jsx` (`{activity}` + `TYPE_MAP`) | **Directly reusable** for `CustomerActivity` |
| `RecentOrders` | `dashboard/RecentOrders.jsx` (`{orders}`) | Table/list template for `CustomerOrdersList` |
| `LowStockList` | `dashboard/LowStockList.jsx` (`{products}`) | List-row template for `CustomerAddresses` |
| `ProductImage` | `products/ProductImage.jsx` (`{src, alt, size, onError}` fallback) | Avatar pattern for customer rows + drawer header |
| `useToast`/`ToastProvider` | `toast/` | Notifications (if any action added later) |
| `classNames`, `format.*` | `utils/classNames.js`, `utils/format.js` (`formatMoney, formatDate, formatDateTime, formatCount, timeAgo`) | All formatting |
| `api.js` + interceptors | `services/api.js` | Axios base + token + 401 teardown — new service reuses it |
| Order status/payment badges | `orders/OrderStatusBadge.jsx`, `OrderPaymentBadge.jsx` | Shape template for `CustomerStatusBadge` |

### 6.2 Copy + rename (module-specific — no generic version exists; copy the proven pattern, keep the existing Orders files untouched)

| From | To |
|---|---|
| `OrderSearch.jsx` | `CustomerSearch.jsx` (debounced, `FiSearch` + `FiX` clear) |
| `OrderFilters.jsx` | `CustomerFilters.jsx` (status select: `All / Active / Inactive`) |
| `OrderPagination.jsx` | `CustomerPagination.jsx` ("Showing X–Y of N customers", Prev/Next, Page X of Y) |
| `OrderTable.jsx` | `CustomerTable.jsx` (sortable `SortHeader`, columns: Customer, Email, Phone, Member since, Last login, Status, Action) |
| `OrderRow.jsx` | `CustomerRow.jsx` (avatar + name + email, phone, dates via `formatDate`, `CustomerStatusBadge`, "View" → `onView`) |
| `OrderStatusBadge.jsx` | `CustomerStatusBadge.jsx` (accent map: active → success, inactive → secondary) |
| `OrderDetailDrawer.jsx` | `CustomerDetailDrawer.jsx` (`Modal size="lg"`, `orderId`-style `customerId` state-driven open) |
| OrdersPage skeleton/empty/error block (`OrdersPage.jsx:179-225`) | CustomersPage same states |
| ProductsPage pagination block (`ProductsPage.jsx:249-281`) | (or reuse `CustomerPagination`) |

### 6.3 Must create from scratch

- `components/customers/` folder (all above components + `.module.css` files).
- `CustomerStatsCard.jsx` — thin wrapper rendering 3 `StatCard`s from `profile.stats` (orders, spent, AOV).
- `CustomerOrdersList.jsx` — order rows with `OrderStatusBadge`/`OrderPaymentBadge` + `formatMoney`.
- `CustomerAddresses.jsx` — address list (default badge on `isDefault`).
- `CustomerActivity.jsx` — maps `activity[]` into `ActivityItem` list.
- `services/customer.service.js` — copy `order.service.js` template: `normalizeError`, `listCustomers(params)` → `api.get('/admin/customers', { params })` → `{ customers: data?.customers ?? [], pagination: data?.pagination || EMPTY_PAGINATION }`; `getCustomer(id)` → `data ?? null`.
- `utils/customerStatus.js` — `CUSTOMER_STATUS_META` (`active`/`inactive` + accents), `STATUS_FILTERS`, `getCustomerStatusMeta`, `deriveCustomerStatus(isActive)` (mirror `utils/orderStatus.js`).
- `pages/Customers/CustomersPage.module.css` — copy the `.page/.header/.panel/.toolbar/.stateWrap/.skeleton/.pagination` conventions verbatim from `OrdersPage.module.css` (same triple-gradient background, glass panel, responsive collapse).

### 6.4 CustomersPage structure (server-side pattern, copy OrdersPage)

- State: `customers[]`, `pagination`, `loadState` (`loading|ready|error`), `loadError`, `query` + `debouncedQuery` (400 ms), `status` (`all|active|inactive`), `sort`, `order`, `page`, `refresh`, `viewCustomerId`, `requestIdRef` (race guard — `OrdersPage.jsx:16-36,65-93`).
- Server-side params to `customerService.listCustomers` — **the backend supports pagination, so follow Orders (server-side), not Products (fetch-all + client-side slice)**.
- Reset `page` to 1 on any query/filter change; clamp `safePage` (copy `OrdersPage:83-86`).
- Toolbar: `CustomerSearch` + `CustomerFilters`.
- Ready: `CustomerTable` (sortable headers) + `CustomerPagination`.
- Loading: skeleton rows; Error: `EmptyState` + Try Again (`reload` bumps `refresh`); Empty: `EmptyState` ("No customers found" when `hasFilters`, else "No customers yet") + Clear Filters.
- `CustomerDetailDrawer customerId={viewCustomerId} onClose={...}` rendered beside the table (state-driven, like `OrdersPage:249-253`).
- Drawer body: header (avatar + name + email + `CustomerStatusBadge`), `CustomerStatsCard` grid, then `SectionCard`s for Orders (`CustomerOrdersList`), Addresses (`CustomerAddresses`), Activity (`CustomerActivity`), each with its own inline Loading/Empty state.

### 6.5 Design-system compliance

CSS Modules only; copy existing tokens (`styles/variables.css`) — surfaces, text, semantic accents (`success/info/warning/danger/secondary`), radius, spacing, shadows, breakpoints. Page background, glass panels, table styling (`OrderTable.module.css`), badge styling (`OrderStatusBadge.module.css`), search/filter styling (`OrderSearch/OrderFilters.module.css`) all copy verbatim with the `customers/` prefix. No global stylesheet edits. `api.js`, interceptors, auth teardown untouched.

---

## 7. Files

### 7.1 Files to CREATE

**Backend (5):**
1. `backend/validators/customer.validator.js`
2. `backend/repositories/customer.repository.js`
3. `backend/services/customer.service.js`
4. `backend/controllers/customer.controller.js`
5. `backend/routes/customer.routes.js`

**Admin frontend (17):**
6. `admin-frontend/src/services/customer.service.js`
7. `admin-frontend/src/utils/customerStatus.js`
8. `admin-frontend/src/components/customers/CustomerSearch.jsx` + `.module.css`
9. `admin-frontend/src/components/customers/CustomerFilters.jsx` + `.module.css`
10. `admin-frontend/src/components/customers/CustomerTable.jsx` + `.module.css`
11. `admin-frontend/src/components/customers/CustomerRow.jsx` + `.module.css`
12. `admin-frontend/src/components/customers/CustomerStatusBadge.jsx` + `.module.css`
13. `admin-frontend/src/components/customers/CustomerPagination.jsx` + `.module.css`
14. `admin-frontend/src/components/customers/CustomerDetailDrawer.jsx` + `.module.css`
15. `admin-frontend/src/components/customers/CustomerStatsCard.jsx` + `.module.css`
16. `admin-frontend/src/components/customers/CustomerOrdersList.jsx` + `.module.css`
17. `admin-frontend/src/components/customers/CustomerAddresses.jsx` + `.module.css`
18. `admin-frontend/src/components/customers/CustomerActivity.jsx` + `.module.css`
19. `admin-frontend/src/pages/Customers/CustomersPage.module.css`
20. `SPRINT_22_3_AUDIT.md` (this document — deliberately untracked until commit approval)

### 7.2 Files to MODIFY (minimal, read-only additions)

1. `backend/routes/index.js` — add `import customerRoutes from './customer.routes.js'` (after L13) and `apiRouter.use('/admin/customers', customerRoutes)` (after L32). **2-line additive change.**
2. `backend/repositories/user.repository.js` — change `const USER_SAFE_COLUMNS` (L19) to `export const USER_SAFE_COLUMNS` so the customer repository composes its admin projection from the single source of truth. **1-keyword additive change.** (Alternative if avoided: define the projection locally in `customer.repository.js`; export is preferred.)
3. `admin-frontend/src/pages/Customers/CustomersPage.jsx` — replace the 5-line placeholder with the real page.

### 7.3 Files NEVER to touch

- **Customer storefront (`frontend/`)** — ALL of it: home/collections/product pages, cart, checkout, order success, wishlist, search, account dashboard/profile/addresses/orders/settings, all auth forms, `useCart`/`useCheckout`/`useAuth` hooks, cart session handling.
- **Checkout & payment** — `backend` order placement (`order.service.js` placeOrder, idempotency, stock CAS, rollback), Razorpay/payment integration, `order.routes.js` customer endpoints.
- **Orders (admin)** — `adminOrder.*` files, `OrdersPage`, order drawer, order status/payment badges (read/copy only).
- **Products** — `product.*` backend + `ProductsPage`/`ProductModal`/`ImageUploader`.
- **Dashboard** — `dashboard.*` backend + `DashboardPage` + dashboard components (read/copy only; the existing `GET /api/admin/dashboard/customers` latest-customers endpoint stays untouched).
- **Authentication** — admin auth (`auth.service.js`, `auth.middleware.js`, `auth.routes.js`), customer auth (`customerAuth.*`), `AuthContext`, `ProtectedRoute`, `LoginPage`, token storage, 401 interceptor.
- **Cloudinary** — `upload.*` + `upload.service.js`.
- **Schema/migrations** — no `schema.sql` or migration changes; RLS untouched; no `.env` changes.

---

## 8. Risks & Mitigations

| Risk | Detail | Mitigation |
|---|---|---|
| **N+1 queries** | Looping per-customer queries would explode on a large list. | The list endpoint returns **profile fields only** — no per-row aggregates → zero N+1 in the list. The detail runs exactly **3 parallel queries** (`Promise.all`): order stats, addresses (reused `findAllByUser`), orders+items (`ORDER_WITH_ITEMS`). Activity is derived from those same rows (no 4th query). |
| **Performance** | Full-table scans / PostgREST 1000-row cap (see `dashboard.repository.js:22`). | List uses `.range(offset, offset+limit-1)` + `{ count: 'exact' }` (PostgREST exact count **before** range) — the same pattern `findAllOrders` already proves in production. Per-user queries are naturally bounded by that user's rows. No `FULL_SCAN` anywhere in the new code. |
| **Pagination** | Page overflow, stale page after filters shrink results, huge `total`. | Copy `listAdminOrders` math (`totalPages = max(1, ceil(total/limit))`); frontend resets to page 1 on filter/search change and clamps `safePage` (copy `OrdersPage`). |
| **Sorting** | Arbitrary sort columns / SQL injection via `order`. | `sort` is strictly allowlisted (`created_at|last_login_at|first_name|email|role`); `order` is `asc|desc` only — enforced in the validator before it reaches the repo. |
| **Searching** | Unbounded / injection-prone search. | `search` trimmed + sliced to 64 chars; applied only via parameterized PostgREST `.or(first_name/last_name/email/phone ilike)` — no string interpolation into SQL. |
| **Deleted customers** | Orders keep `user_id` nullable (`ON DELETE SET NULL`); a missing user row would 500. | `findCustomerById` → if `!data` throw `ApiError(404, 'Customer not found')` (clean, mapped by the error handler). Frontend detail drawer shows a friendly error state. (App has no hard-delete flows today — `is_active` only.) |
| **Customers without orders** | `0/0` AOV; empty order feed. | Stats compute `totalSpent / max(1, saleOrderCount)`; no orders → `{0,0,0}`; `orders.items: []` → drawer empty state ("No orders yet"). |
| **Customers without addresses** | Empty address feed. | `addresses: []` → empty state; addresses are optional everywhere in the schema. |
| **Large datasets** | Thousands of customers/orders in the future. | Paginated + exact-count list; per-user order list also paginated (default limit 10). Optional future-only index `users (role, created_at)` — **deferred, not required now** (documented, no migration in Sprint 22.3). |
| **Regression** | Breaking existing storefront/order/dashboard behavior. | Read-only module; reuses `normalizeCustomer`, `normalizeOrder`, `ORDER_WITH_ITEMS`, `findAllByUser` untouched; the only existing-file changes are 2 additive lines (`routes/index.js`) + an export keyword (`user.repository.js`). Full regression gate in §9. |
| **Auth** | Non-admin access; session expiry. | `router.use(authorize('admin'))` (403 non-admin); existing `api.js` 401 interceptor already logs the admin out on expiry — reused automatically by the new service. |
| **Frontend performance** | Client-side filtering of a large list. | **Server-side pagination** (Orders template), 400 ms debounced search, `requestIdRef` race guard, skeleton states. Explicitly NOT the fetch-all Products pattern. |
| **Git hygiene** | Temp files, debug code, unrelated changes in the commit. | Only the §7.1/7.2 files touched; audit doc untracked; `git status` audited before commit; no console.log/debugger/TODO in new files; lint + build clean. |

---

## 9. Verification Plan

### 9.1 Backend (node harness, like `final-backend-regression.mjs`)
- Admin login → `GET /admin/customers`: default list (customers array + pagination shape).
- Pagination: `page=2&limit=1` returns the expected slice; `page` overflow returns `[]` with correct `total`; `limit` bounds (1/100/101 → 400).
- Search: by `first_name`, `last_name`, `email`, `phone`; non-matching → `[]`; 65-char search trimmed.
- Filters: `status=active` / `status=inactive`; invalid `status` → 400.
- Sort: each allowlisted column asc + desc; invalid `sort` → 400; invalid `order` → 400.
- Detail: customer with orders + addresses → profile/stats/addresses/orders/activity all present and correct; **stats cross-checked against direct DB aggregate** (`count` and `sum(grand_total)` excluding cancelled/refunded).
- Edge: customer with **no orders** → `stats {0,0,0}`, `orders.items []`, activity has no order events; customer with **no addresses** → `addresses []`.
- Errors: nonexistent UUID → 404; malformed UUID → 400; no token → 401; customer token → 403; expired admin token → 401.

### 9.2 Frontend (CDP browser harness, like `dashboard-live-test.mjs` / `admin-ui-test.mjs`)
- Customers page: renders header/toolbar/table from live API; no mock data.
- Search: typing filters the list (server-side), Clear resets.
- Status filter: `Active`/`Inactive`/`All`; combined with search.
- Pagination: page 2, Previous/Next bounds, "Showing X–Y of N customers".
- Sort: clicking column headers flips `aria-sort` and re-orders rows.
- Detail drawer: open → avatar/name/email/status, 3 stats cards match API, Orders list (badges + money), Addresses (default badge), Activity rows; close restores list.
- Empty/error states via the proven in-page XHR prototype patch (`localStorage` mode flags): no-customers empty state, server-error → Try Again → recovery.
- Browser cleanliness: zero console errors, zero React warnings, zero network failures.

### 9.3 Builds & lint
- `npm run build` in `admin-frontend/` (passes; pre-existing 715 kB chunk-size warning only) and `frontend/` (unchanged — must still pass).
- `npm run lint` in `admin-frontend/` — clean (Sprint 22.2 ended clean after the `DashboardPage.jsx` fix).

### 9.4 Regression (full gate)
- Backend final regression 58/58 (`final-backend-regression.mjs`).
- Storefront API smoke 10/10; dashboard-accuracy 7/7 (baseline: 2 orders pending/pending, 15 products, 2 customers, ₹6,951, 5 active low-stock).
- Admin browser suites: dashboard-live 19/19, admin-ui 15/15, admin-filters 9/9, crud-products 12/12, audit-auth 30/30, storefront-ui 15/15.
- **DB untouched by the module** — baseline counts re-verified after all tests (no new rows, no mutations).

### 9.5 Database verification
- Confirm no schema/migration change; baseline counts identical post-regression; the module issues only SELECTs.

### 9.6 Auth verification
- Customer JWT rejected on `/admin/customers` (403); admin JWT accepted; expired token → 401; the module never touches customer tokens or admin credentials.

### 9.7 Performance
- List page-2 request returns promptly (exact count, no full scan); detail resolves in constant queries; code review confirms zero per-row loops.

### 9.8 Git hygiene
- `git status --short` shows exactly the §7.1/7.2 files + `SPRINT_22_3_AUDIT.md` (untracked); no temp files; grep new files for `console.log|debugger|TODO|FIXME`; commit only after explicit approval.

---

## 10. Roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **Phase 1 — Backend APIs** | `customer.validator.js`, `customer.repository.js` (list/detail/stats/orders), `customer.service.js` (`adminCustomerFor`, stats, activity, list/detail), `customer.controller.js`, `customer.routes.js`, `routes/index.js` mount, export `USER_SAFE_COLUMNS`. | Backend harness green (§9.1); `GET /admin/customers` + `/:id` verified against direct DB aggregates. |
| **Phase 2 — Frontend customer list** | `customer.service.js`, `utils/customerStatus.js`, `CustomerSearch/Filters/Table/Row/StatusBadge/Pagination`, `CustomersPage` (server-side, loading/empty/error states), `CustomersPage.module.css`. | Browser harness green: list, search, filters, sort, pagination, empty/error states, cleanliness. |
| **Phase 3 — Customer detail drawer** | `CustomerDetailDrawer` (Modal lg) + `CustomerStatsCard`, `CustomerOrdersList`, `CustomerAddresses`, `CustomerActivity`. | Browser harness green: drawer renders profile/stats/orders/addresses/activity; empty-state handling per section. |
| **Phase 4 — Regression** | Full gate §9.3-9.8: builds, lint, backend 58/58, storefront 10/10, admin suites, DB baseline, auth, performance, git audit. | All suites green; baseline unchanged; lint/build clean; only intended files changed. |
| **Phase 5 — Commit** | Stage §7.1/7.2 files; `SPRINT_22_3_AUDIT.md` **left untracked**; commit message in repo style (e.g. `feat: complete Sprint 22.3 admin customers`). | **Only after explicit user approval.** |

---

### Rules honored
- No implementation, no code changes, no commit performed in this audit.
- No migrations proposed — the schema already satisfies every requirement (§2.5).
- Follows existing architecture only (envelope repositories → services → thin controllers → `authorize('admin')` routes).
- Reuses `normalizeCustomer`, `normalizeOrder`, `ORDER_WITH_ITEMS`, `findAllByUser`, `parseAdminOrderQuery`, `listAdminOrders` pagination math, dashboard activity/stat semantics.
- Storefront, checkout, orders, products, dashboard, authentication, Cloudinary, payment flow all remain untouched.