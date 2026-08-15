# UNSORTED — Sprint 21.3 Audit (Cart & Checkout Foundation)

**Status:** Phase 1 — Audit only. No code written.
**Base commit:** `e244582` ("feat: complete Sprint 21.2 customer profile and address management") — working tree clean on `main` (single untracked stray `package-lock.json` at repo root, not ours to commit).
**Scope:** Sprint 21.3 = plan milestones **21C/21D** (persistent cart + real order placement). This document audits the current state and produces the implementation strategy. Nothing is implemented until this audit is approved.

---

## 1. Current architecture (cart / checkout / order / guest / auth / stock / dashboard / backend)

### 1.1 The data layer already exists in the database

The single most important finding of this audit:

> **`backend/database/schema.sql` already defines `cart`, `cart_items`, `orders`, and `order_items` (schema.sql:121–184) with full indexes and triggers. What does NOT exist is any backend or frontend code that talks to them.** The storefront runs a pure localStorage mock for both cart and orders, and the only cart API in the backend is an in-memory array (`server.js:120`) built for the legacy customer-site sync, not the React storefront.

So Sprint 21.3 is not a database-design sprint. It is a **wiring sprint**: implement the missing layered modules (`routes → controllers → services → repositories → Supabase`) against tables that are already migrated, then replace the frontend localStorage mocks with real API calls.

### 1.2 What exists today

| Concern | Backend | Frontend |
|---|---|---|
| Cart | In-memory `let cart = []` in `server.js:120–181` (`GET/POST/PUT/DELETE /cart`) — legacy customer-site only; not part of `/api` | `services/cartStorage.js` (localStorage `unsorted_cart_v1`) + `context/CartContext.jsx` |
| Checkout | None | `hooks/useCheckout.js` — full frontend-only state machine (3-step flow, validation, coupons, totals) |
| Orders | None (`orders`/`order_items` tables unused) | `services/orderStorage.js` (localStorage `unsorted_orders_v1` + `unsorted_last_order_v1`, **with demo seed data**) |
| Order success | None | `pages/OrderSuccessPage` reads `unsorted_last_order_v1` |
| Dashboard / Orders | None | `pages/OrdersPage` + `pages/DashboardPage` read `loadOrders()` (localStorage) |
| Auth | `/api/customer/auth/*` (21.1), `/api/customer/profile`, `/api/customer/addresses` (21.2) | `AuthContext` wired to real API (21.2) |
| Stock | `products.stock_quantity` column only; no decrement logic anywhere | `clampQty()` caps at `min(10, stock)` in `CartContext.jsx:14` |

### 1.3 Provider ordering (guest cart + auth interplay)

`main.jsx` nests: `ThemeProvider > WishlistProvider > CartProvider > AuthProvider > BrowserRouter`. Cart is **outside** Auth, so a guest cart works without a session — good. But it means `CartContext` cannot directly call `useAuth()`; the **merge-on-login** concern must be handled either at the API layer (backend adopts the session cart) or via a coordinated event, not by importing auth into the cart provider.

---

## 2. Database audit

All four tables already exist (`backend/database/schema.sql`, mirrored in `001_initial_schema.sql`; no cart/order migration has ever been applied, so no gap between migration history and schema).

### 2.1 `cart` (schema.sql:121)

```sql
id         uuid pk default gen_random_uuid(),
user_id    uuid references users(id) on delete cascade,   -- nullable
session_id text,                                          -- nullable (guest)
status     text not null default 'active' check (status in ('active','abandoned','checked_out')),
created_at / updated_at timestamptz,
check (user_id is not null or session_id is not null)
```

- Indexes: `idx_cart_user (user_id)`, `idx_cart_session (session_id)`. Trigger `trg_cart_updated_at`. RLS enabled, **zero policies** (locked for anon key; backend uses service-role key which bypasses RLS).
- **Gap:** no partial unique index enforcing "one active cart per user". `user_id` may be `null`; `session_id` unconstrained (no format/ownership). Needs a decision: one active cart per user via `create unique index ... where status = 'active'` (careful — guest carts have `user_id = null` and multiple `session_id` values would collide on `NULL`; Postgres treats `NULL` as distinct, so a partial index on `user_id` where `user_id is not null and status='active'` is safe).

### 2.2 `cart_items` (schema.sql:132)

```sql
id, cart_id uuid not null references cart(id) on delete cascade,
product_id bigint not null references products(id) on delete cascade,
size text, color text, color_name text,
quantity integer not null default 1 check (quantity > 0),
created_at / updated_at timestamptz,
unique (cart_id, product_id, size, color)
```

- Indexes: `idx_cart_items_cart`, `idx_cart_items_product`. Trigger present. RLS enabled, zero policies.
- **Gap:** no upper bound on `quantity` (frontend caps at 10; DB would accept 1000). No `CHECK (quantity <= 10)` — a design choice; leaving it unbounded is acceptable since the backend clamps.

### 2.3 `orders` (schema.sql:148)

```sql
id uuid pk default gen_random_uuid(),
user_id uuid references users(id) on delete set null,     -- nullable (guest)
order_number text not null unique,                        -- idempotency anchor
status text default 'pending' check (pending, confirmed, processing, shipped, delivered, cancelled, refunded),
payment_status text default 'pending' check (pending, paid, failed, refunded),
payment_method text,
subtotal, discount, shipping, tax, grand_total numeric(12,2) >= 0,
currency text default 'INR',
coupon_code text,
shipping_address jsonb, contact jsonb,                    -- snapshots
placed_at / created_at / updated_at timestamptz
```

- Indexes: `idx_orders_user`, `idx_orders_status`, `idx_orders_payment_status`, `idx_orders_placed_at desc`. Trigger present. RLS enabled, zero policies.
- **Strong points:** `order_number unique` gives a natural idempotency key; `shipping_address`/`contact` jsonb snapshots decouple order history from later user edits (same philosophy as the 21.2 address snapshot).

### 2.4 `order_items` (schema.sql:172)

```sql
id uuid pk, order_id uuid not null references orders(id) on delete cascade,
product_id bigint references products(id) on delete set null,
name text not null, price_at_order numeric(12,2) not null, image_url text,
size, color, color_name, quantity integer not null default 1 check (quantity > 0), created_at
```

- Indexes: `idx_order_items_order`, `idx_order_items_product`. No trigger (fine — created_at only).
- **Gap:** no stock snapshot column. The `products.stock_quantity` decrement at order time is the source of truth; `order_items` stores only `price_at_order` (correct — price is snapshotted, stock is not). Stock reconciliation ("what was in stock when I ordered") would require joining order_items → products at read time; acceptable.

### 2.5 Summary of DB gaps

1. **No atomicity available** — PostgREST/Supabase has no server-side transactions. Order placement (`insert orders` → `insert order_items` → mark cart `checked_out` → decrement stock) must be a clear-then-set sequence with compensating cleanup on failure, or a Postgres **function/RPC** (`rpc('place_order', ...)`) to get true atomicity + conditional stock decrement in one call.
2. **No stock decrement** anywhere yet; `stock_quantity >= 0` CHECK exists (schema.sql:57) so an overselling write **fails loudly** — usable as a concurrency guard if we do conditional updates (`update products set stock_quantity = stock_quantity - q where id = ? and stock_quantity >= q returning id`).
3. **No "one active cart per user"** constraint (optional hardening).
4. **RLS** on all four tables has zero policies — fine for service-role writes, but defense-in-depth policies for the anon key (like 21.2's `addresses_*_own`) are worth adding later, not required now.

---

## 3. Frontend audit

### 3.1 Cart — `services/cartStorage.js` + `context/CartContext.jsx`

- `cartStorage.js` (43 lines): key `unsorted_cart_v1`; `isValidLine` requires `id` string, `productId` defined, `price` finite; `loadCartItems` never throws; `saveCartItems` swallows storage failures; `clearStoredCart`.
- `CartContext.jsx` public API (line 96): `{ items, count, totals, isOpen, addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, openCart, closeCart, toggleCart }`.
- `clampQty(qty, stock)` (line 14): `desired = max(1, floor(qty))`, `cap = max(1, min(MAX_ITEM_QTY=10, stock||10))`, returns `min(cap, desired)`. So the frontend already never exceeds stock — but **stock is a snapshot from product-page time**, never re-validated at checkout.
- Cart line shape: `{ id: '<productId>::<size>::<color>', productId, name, category, price, oldPrice, size, color, colorName, imageUrl, stockQuantity, quantity }`. Prices are client-side numbers — **not trustworthy server-side**.
- Persists on every mutation via `useEffect` (line 25).

### 3.2 Checkout — `hooks/useCheckout.js` (302 lines)

- 3-step flow (Shipping → Payment → Review), shared `addressValidation` (re-exported `CountriesList`), `DELIVERY_OPTIONS` (standard/express/pickup), `PAYMENT_METHODS` (card/upi/netbanking/cod + razorpay disabled "Coming soon").
- Coupons hardcoded: `WELCOME10` (10%), `UNFILTERED15` (15%) — `COUPONS` at line 41.
- `checkoutTotals(items, deliveryId, coupon)` (line 116): subtotal − coupon + delivery + 5% GST (`ESTIMATED_TAX_RATE`), free shipping ≥ `FREE_SHIPPING_THRESHOLD` (2499), express = +199. **All client-side math — the server must recompute**.
- `placeOrder()` (line 228): builds `orderNumber = 'US-' + year + Date.now().slice(-6)`, order object with `items`, `totals`, `shipping` snapshot, `delivery`, `etaDate`, `payment`, `coupon`, `notes`; calls `saveOrder(order)` (localStorage), `clearCart()`, `navigate('/checkout/success', { replace: true })`. **No API call, no stock check, no idempotency guard beyond the local `placing` flag.**

### 3.3 Orders — `services/orderStorage.js` (195 lines)

- Keys: `unsorted_last_order_v1` (success page) + `unsorted_orders_v1` (history).
- `loadOrders()` (line 149) **seeds three fake demo orders on first access** (`SEED_ORDERS`, line 101) and merges `unsorted_last_order_v1` into history. Demo seed must be retired once the dashboard reads the real API.
- `withTotals` recomputes totals from items (client math again).
- Consumer pages: `OrderSuccessPage`, `OrdersPage`, `DashboardPage`, plus order cards/modals (`components/dashboard/OrderCard`, `OrderModal`).

### 3.4 localStorage keys inventory (9 total)

`unsorted_cart_v1`, `unsorted_orders_v1`, `unsorted_last_order_v1`, `unsorted_wishlist_v1`, `unsorted_customer_token`, `unsorted_customer_user`, `unsorted_settings_v1`, `unsorted_search_history_v1`, `unsorted_theme`. Sprint 21.3 touches the three cart/order keys; the rest are out of scope.

### 3.5 Frontend conclusions

- **Reuse:** the cart UI, drawer, cart page, checkout pages, validation, and order-success/modal UI are polished and correct. Only the **data layer** needs to change: `CartContext` persistence → API, `useCheckout.placeOrder` → API, `OrdersPage`/`DashboardPage`/`OrderSuccessPage` → API.
- **Must change:** `orderStorage.js` demo seeding; `useCheckout` client math becomes a server-computed quote; stock re-validation at checkout.
- **Guest cart merge:** a logged-in customer who added items before login must have their guest cart merged into the user cart (backend adoption or client merge on auth change).

---

## 4. Backend audit

### 4.1 Proven layered pattern to copy

Every 21.1/21.2 module follows the same shape (see `address.*` as the cleanest template):

| Layer | File | Notes |
|---|---|---|
| Route | `routes/address.routes.js` | `authorize('customer')` on user-scoped routes; mounted in `routes/index.js:24` |
| Controller | `controllers/address.controller.js` | thin; `asyncHandler`; shapes `{ success, data }` |
| Service | `services/address.service.js` | business rules, `ApiError` with `status`+`expose`, error mapping (`23505 → 409`) |
| Repository | `repositories/address.repository.js` | `getSupabase()` client, `{ ok, data, reason, code }` envelope, ownership guards via `.eq('user_id', userId)` |
| Middleware | `middleware/auth.middleware.js` | `authorize('customer')` sets `req.user` for customer tokens; admin tokens → `req.admin` |
| Validators | `validators/user.validator.js` | register/login/reset; cart/order validators would be new files |
| Config | `config/`, `utils/apiError.js`, `utils/logger.js` | shared |

### 4.2 What is missing for 21.3

- **No cart module:** no routes/controllers/services/repositories for `cart`/`cart_items`.
- **No order module:** nothing for `orders`/`order_items`.
- **No stock service:** no read/decrement of `products.stock_quantity`.
- **No payment integration:** `razorpay_checkout.js` exists only in legacy root files; the React storefront's "Razorpay — coming soon" is a disabled radio. Payment is out of scope for 21.3 (payments sprint later); `payment_method` will be recorded as chosen method with `payment_status = 'pending'` for non-COD, `'paid'` for COD at dispatch time is a later-sprint concern.
- **`server.js` in-memory cart** (`/cart` routes) is legacy customer-site sync — **must not be touched or removed**; it is separate from `/api`.

### 4.3 Reuse inventory (what can be reused as-is)

`authorize('customer')`, `ApiError`/`asyncHandler`, the `{ ok, data, reason, code }` envelope, `getSupabase()`, `addressValidation` (shared FE/BE parity approach from 21.2), `normalizeCustomer`, the service-role RLS-bypass model, `products` repository pattern, and `config/index.js`.

---

## 5. Architecture (kept layered)

```
POST /api/cart/items               { productId, size, color, quantity }   [customer or guest]
GET  /api/cart                     → { id, items:[…], totals }            [customer or guest]
PUT  /api/cart/items/:itemId       { quantity }                           [customer or guest]
DELETE /api/cart/items/:itemId                                            [customer or guest]
POST /api/cart/merge               (adopt guest session cart into user cart on login)

POST /api/orders                   { sessionId?, addressId?|shippingSnapshot, delivery, payment, coupon, items }  → { order }
GET  /api/orders                   → customer's order history             [customer]
GET  /api/orders/:id               → single order + items                 [customer, ownership-guarded]
```

### 5.1 Identity model

- **Authenticated** cart/order: keyed by `req.user.id`, stored in `cart.user_id`.
- **Guest** cart/order: keyed by a client-generated `session_id` (UUID stored in localStorage), stored in `cart.session_id`. Orders from a guest are placed with `user_id = null` and full `shipping_address`/`contact` jsonb snapshots.
- **Merge on login:** backend `POST /api/cart/merge` — when a session cart exists and the user has an active cart, merge line-by-line (`unique (cart_id, product_id, size, color)` makes conflicts natural: merge = upsert quantity, capped at stock), then delete the session cart.

### 5.2 Order placement (no transactions → clear-then-set + guard rails)

Because Supabase/PostgREST cannot run multi-statement transactions from the client SDK, order placement is a **sequenced write with compensating rollback**, executed in this order:

1. **Recompute totals server-side** from current product prices (never trust client `totals`/`items.price`).
2. **Stock check + conditional decrement** per line: `update products set stock_quantity = stock_quantity - q where id = ? and stock_quantity >= q` — if any line returns 0 rows, the order is rejected (insufficient stock) and nothing is written yet.
3. **Insert `orders`** with `order_number` generated server-side (`US-YYYYMMDD-<random>`) — the `unique` constraint is the idempotency anchor.
4. **Insert `order_items`** snapshots (name, price_at_order, image_url, size, color, quantity).
5. **Mark cart `checked_out`** (status change, not delete — preserves the cart row for audit).
6. On any failure in steps 3–5: best-effort **compensate** (delete the order row if created, or roll back the stock decrement by `+q`), then return a 500.

### 5.3 Idempotency / double-submit guard

- Client sends an `idempotencyKey` (UUID) with `POST /api/orders`; server rejects/reuses if an order with that key already exists. Also keep the frontend `placing` flag and disable the submit button (already present in `useCheckout`).
- `order_number` uniqueness is the final backstop against duplicate rows.

### 5.4 Pricing/quote consistency

`useCheckout.checkoutTotals` becomes a **server-computed quote**. The recommended flow: `POST /api/orders/quote` (stateless, recomputes totals + applies coupon + stock status) and the frontend displays the quote, then `POST /api/orders` replays the same computation at placement. Coupon codes move from hardcoded `COUPONS` (useCheckout.js:41) to a server-owned coupon table or a config constant in a new `services/coupon.service.js` — decide: coupon **table** (enterprise) vs **config map** (fast). Recommend a `coupons` table now since schema changes are cheap and it avoids a later migration.

---

## 6. Required files

### 6.1 Create

Backend (`backend/`):
- `routes/cart.routes.js`, `routes/order.routes.js`
- `controllers/cart.controller.js`, `controllers/order.controller.js`
- `services/cart.service.js`, `services/order.service.js`, `services/stock.service.js` (decrement + check), `services/coupon.service.js`
- `repositories/cart.repository.js`, `repositories/order.repository.js`
- `validators/cart.validator.js`, `validators/order.validator.js`
- `database/migrations/004_cart_orders.sql` — only if we add the coupon table and/or the "one active cart per user" partial index. **Do not** alter existing `cart/orders/order_items` columns.

Frontend (`frontend/src/`):
- `services/cart.js` (API client for cart endpoints), `services/orders.js` (API client), `services/coupons.js` (or fold into orders.js)
- `hooks/useOrders.js`
- `utils/checkoutConfig.js` or fold constants — keep `cartConfig.js` for cart math but stop trusting it for totals

### 6.2 Modify

- `backend/routes/index.js` — register the two new routers (pattern: line 24).
- `frontend/src/context/CartContext.jsx` — persistence → API; keep public API stable so drawer/pages untouched.
- `frontend/src/hooks/useCheckout.js` — `placeOrder` → `POST /api/orders`; totals → server quote; keep steps/UI.
- `frontend/src/pages/OrderSuccessPage.jsx`, `OrdersPage.jsx`, `DashboardPage.jsx` — read from API.
- `frontend/src/services/index.js` — barrel exports.
- `frontend/src/components/dashboard/OrderCard.jsx` / `OrderModal.jsx` — shape mapping if order JSON differs from localStorage shape.

### 6.3 Never touch

- `admin-frontend/` — completely separate admin surface.
- `backend/database/migrations/001_initial_schema.sql`, `002_customer_auth.sql`, `003_addresses.sql` — immutable history.
- Legacy customer-site files: `index.html`, `style.css`, `script.js`, `checkout_patch.js`, `razorpay_checkout.js`.
- `backend/server.js` in-memory `/cart` endpoints and the legacy file serving (lines 96–181) — legacy sync must keep working.
- `frontend/src/services/authStorage.js` / `wishlistStorage.js` / `settingsStorage.js` / `searchHistory.js` — out of scope.

---

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Stock overselling / double-decrement** on concurrent orders | High | Conditional decrement `where stock_quantity >= q` + `stock_quantity >= 0` CHECK; single RPC or sequenced writes with compensation |
| 2 | **Duplicate orders** (double-click, retry after timeout) | High | `idempotencyKey` + `order_number` unique + existing `placing` flag |
| 3 | **Inconsistent order writes** (items written but cart not checked out, or stock decremented but order failed) | High | Strict write order (decrement first, then order, then items, then cart) + compensating rollback on failure; verify via audit script |
| 4 | **Client-side totals trusted** (tampered price/quantity) | High | Server recomputes all prices/quantities from DB at placement; client totals display-only |
| 5 | **Guest cart merge conflicts** (login merges wrong quantities, or session cart orphaned) | Medium | Backend `POST /api/cart/merge` with upsert-by-`unique(cart_id, product_id, size, color)`; delete session cart after adoption; test matrix (empty×empty, guest only, user only, both) |
| 6 | **Demo order seeding pollutes real history** after API switch | Medium | Remove `SEED_ORDERS` seeding from `orderStorage.js` (or gate behind dev flag) in the same sprint |
| 7 | **Stale cart stock snapshot** (product page showed 5, now 1) | Medium | Re-validate stock at quote + at placement; surface "out of stock" per line |
| 8 | **Guest order can't be retrieved later** (`user_id = null`) | Low (accepted) | Guest success page uses the response order; order history is authenticated-only by design |
| 9 | **RLS defense-in-depth missing** for cart/orders (anon key) | Low | Service-role writes bypass RLS (current model, fine); add `*_own` policies as hardening later |
| 10 | **Razorpay "coming soon"** — payments out of scope | Low | Keep `payment_method` recorded; `payment_status = 'pending'`; do not build payment flow in 21.3 |

---

## 8. Enterprise improvements (references)

Benchmark the design against how established platforms handle these concerns (Medusa, Saleor, Commerce Layer, Shopify):

1. **Server-authoritative pricing & taxes** — never compute totals in the browser (Shopify checkout API, Medusa `CartService` all recompute server-side). Adopt the quote-then-commit flow.
2. **Idempotent checkout** — Shopify/Stripe use idempotency keys on order/charge creation; our `order_number` + `idempotencyKey` matches this.
3. **Stock reservation** — platforms reserve stock at checkout with a TTL (abandoned reservation expiry) rather than decrementing only at final payment. An `orders.reserved_until` column is the enterprise evolution; note as future work, not 21.3.
4. **Order state machine** — status transitions (`pending → confirmed → …`) should be a single service method with an explicit transition map (like Saleor's order events), not scattered `update status` calls.
5. **Cart expiry / abandoned carts** — `cart.status` already has `'abandoned'`; a cron/scheduled job to expire old `session_id` carts is future work.
6. **Coupons as first-class data** — a `coupons` table (code, percent/amount, min subtotal, usage limits, active flag) instead of a hardcoded map; validates on the server.
7. **Inventory ledger** — enterprise systems keep an immutable stock movement log rather than mutating `stock_quantity` only. Optional future table `stock_movements`.
8. **Audit trail + webhooks** — order events (placed, paid, shipped) logged and webhook-notified; out of scope now but the layered service design makes it additive.

---

## 9. Detailed implementation strategy

**Phase 0 — DB (only if approved additions):** `004_cart_orders.sql` = optional `coupons` table + partial unique index `one active cart per user` (guarded `where status='active' and user_id is not null`). No changes to existing cart/order columns.

**Phase 1 — Backend cart API** (mirror `address.*`):
1. `validators/cart.validator.js` — payload shape, quantity clamp `[1,10]`.
2. `repositories/cart.repository.js` — `findActiveByUserId`, `findActiveBySessionId`, `createCart`, `upsertItem` (use `unique(cart_id, product_id, size, color)` + `onConflict`), `updateItemQuantity`, `deleteItem`, `clearCart`, `mergeSessionIntoUser`.
3. `services/cart.service.js` — identity resolution (user vs session), stock clamp at add time, totals via server pricing (`calcSubtotal`-equivalent from DB prices), merge semantics.
4. `controllers/cart.controller.js` + `routes/cart.routes.js` (customer-authenticated and guest-with-`sessionId` variants; guest routes must NOT require a token, so they authenticate optionally).
5. Wire in `routes/index.js`.

**Phase 2 — Backend orders API:**
1. `validators/order.validator.js` — items, delivery, payment, coupon, address snapshot/idempotency key.
2. `repositories/order.repository.js` — `insertOrder`, `insertOrderItems`, `markCartCheckedOut`, `findOrdersByUser`, `findOrderById` (ownership-guarded), `rollbackStock`.
3. `services/stock.service.js` — `decrementWithCheck` (conditional update, returns affected lines).
4. `services/coupon.service.js` — validate + compute discount (server-side).
5. `services/order.service.js` — the sequenced write (§5.2) with compensation, idempotency key check, server-side totals.
6. `POST /api/orders/quote` (optional but recommended for parity) + `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`.
7. Wire in `routes/index.js`; register `authorize('customer')` for the authenticated list/detail endpoints.

**Phase 3 — Frontend cart wiring:**
1. `services/cart.js` — API client.
2. `CartContext.jsx` — hydrate from `GET /api/cart` on mount (session key from localStorage), all mutations → API, keep public API identical. On auth change (login), call `POST /api/cart/merge`.

**Phase 4 — Frontend checkout wiring:**
1. `useCheckout.js` — `placeOrder` → `POST /api/orders` with idempotency key; display server quote (from `POST /api/orders/quote` or the placement response); surface per-line stock failures; keep steps/validation.
2. `OrderSuccessPage.jsx` — read the order from the placement response / `GET /api/orders/:id`.

**Phase 5 — Orders dashboard wiring:**
1. `services/orders.js` + `hooks/useOrders.js`.
2. `OrdersPage.jsx` / `DashboardPage.jsx` — real history from `GET /api/orders`; retire `SEED_ORDERS` demo seeding in `orderStorage.js` (keep `unsorted_last_order_v1` only as a dev fallback or remove entirely).

**Phase 6 — Verification + commit:**
1. Frontend build (`npm run build`) and backend boot must pass.
2. Live API audit script (mirroring the 21.2 approach): guest cart CRUD, authenticated cart CRUD, merge matrix, quote math parity (FE vs BE), stock oversell rejection, duplicate-order idempotency, ownership isolation (user A cannot read user B's cart/orders), guest checkout → order row with null user + snapshots.
3. Clean up test data; commit as a single clean commit (`feat: complete Sprint 21.3 cart and checkout foundation`) only after the audit is approved and implementation verified.

---

**Gate:** No code is written until this document is approved. On approval, proceed Phase 0 → 6 with the layered pattern and the risk mitigations in §7.