# Sprint 22.4 — Audit & Implementation Plan

> **Status:** AUDIT ONLY. No production code was written, no files were
> modified, and no implementation has started. This document is the only file
> created by this audit.

---

## 1. Sprint 22.4 title

**"Complete the Customer Wishlist — Backend Sync & Account Persistence"**

The storefront already has a complete wishlist UI and the database already has
a `wishlist` table, but the two are not connected: wishlist data lives only in
`localStorage` and there is no wishlist API. Sprint 22.4 closes that gap by
exposing the `wishlist` table through the customer API, syncing account
wishlists to the backend, and merging a guest's local wishlist on login —
mirroring the cart merge pattern built in Sprint 21.3.

**No database migration is required.** The `wishlist` table, its
`unique (user_id, product_id)` constraint, and the `idx_wishlist_user` index
already exist in `backend/database/schema.sql` and migration
`001_initial_schema.sql`.

---

## 2. Current repository baseline

- **HEAD:** `d72d296` — `feat: complete Sprint 22.3 admin customer management`
- **Working tree:** clean (verified `git status` → `nothing to commit`)
- **Branch:** `main`, up to date with `origin/main` (nothing pushed for 22.3)
- **History (last 10):**

```
d72d296 feat: complete Sprint 22.3 admin customer management
9ffdce0 feat: complete Sprint 22.2 live admin dashboard analytics
da6c089 fix: validate admin session and handle unauthorized access
2bc84f7 feat: complete Sprint 22.1 admin order management
abc69d2 feat: complete Sprint 21.3 cart checkout and order management
e244582 feat: complete Sprint 21.2 customer profile and address management
022bcfd feat: complete Sprint 21.1 customer authentication
3e24cb7 feat: complete Sprint 20 admin auth upload and Cloudinary integration
21f779f chore: clean repository and remove legacy assets
6b565da Clean repository by removing generated files and unused assets
```

### Application layout

| Area | Location | Notes |
|---|---|---|
| Backend (Express + Supabase) | `backend/` | routes → controllers → services → repositories → Supabase. Central config in `backend/config/index.js`. |
| Customer storefront (React + Vite) | `frontend/` | Dev proxy `/api` → `localhost:3001`; prod `REMOTE_BASE=https://unsorted-backend.onrender.com`; Vercel rewrites `/api/*` → Render backend. |
| Admin (React + Vite) | `admin-frontend/` | `VITE_API_URL` in local `.env` (`http://localhost:3001/api`); no deployment config. |
| Database | `backend/database/schema.sql` + `backend/database/migrations/{001,002,003}` | Supabase/PostgreSQL 15+. |
| Root | `vercel.json`, legacy single-page files (`index.html`, `style.css`, `script.js`, `checkout_patch.js`, `razorpay_checkout.js`), sprint audit docs. | |

No root `package.json` exists. Each app manages its own scripts.

---

## 3. Completed functionality

| Sprint | Delivered |
|---|---|
| **20** | Admin JWT auth (`/api/auth/login`, `/api/auth/me`), admin session validation, uploads via multer → Cloudinary. |
| **21.1** | Customer auth: register, login, forgot/reset password (reset token stored as SHA-256 hash, single-use, TTL), customer JWT (7d), RLS policies for `users`. |
| **21.2** | Customer profile (`GET/PUT /api/customer/profile`), address book CRUD + default-address invariant (partial unique index `idx_addresses_one_default`). |
| **21.3** | Backend cart (guest `session_id` + user cart + login merge), checkout/orders: server-side pricing, stock CAS, idempotency via deterministic `order_number`, compensating rollback, order history + detail. |
| **22.1** | Admin order management: list/filter/search/sort/pagination, detail drawer (timeline, items, totals), status + payment-status updates. |
| **22.2** | Admin dashboard: stats, sales overview, recent orders, low-stock, best-sellers, latest customers, activity feed. |
| **22.3** | Admin customer management: list/filter/search/sort/pagination, detail drawer with stats, addresses, orders, activity. Fully audited + committed. |

The architecture is consistent across every sprint:
`routes → controllers → services → repositories → Supabase`, with an
allowlisted validator per domain and a shared result envelope
`{ ok, data, [count], reason, [code] }`.

---

## 4. Remaining functionality — major production gaps

Ranked by importance (details in §12 "Current-state audit"):

1. **Wishlist backend sync** — `wishlist` table exists, full UI exists, but no
   API and no account persistence. The single largest "existing UI + existing
   table + no backend" gap. **← Recommended Sprint 22.4.**
2. **Admin Analytics page** — `<h1>Analytics</h1>` placeholder. Dashboard
   service/repository already exposes everything an analytics page needs.
3. **Admin Settings page** — `<h1>Settings</h1>` placeholder. No settings data
   model. Natural companion: store settings + coupon management.
4. **Coupon management** — coupons (`WELCOME10`, `UNFILTERED15`) are hardcoded
   on the frontend (`useCheckout.js`) and mirrored in backend order pricing
   (`computeOrderPricing`). No DB table, no admin UI, no validation of unknown
   codes against a catalog. **Requires a migration** (new `coupons` table).
5. **Categories API** — `categories` table exists and products carry
   `category_id`, but there is no `/api/categories` endpoint; the storefront
   filters client-side over a single full-product fetch. Fine at ~14 products;
   becomes an architecture problem as the catalog grows.
6. **Admin production deployment** — no deployment config or docs for the
   admin app (Vercel/Netlify/Render); `VITE_API_URL` is dev-only.
7. **Legacy surface cleanup** — `server.js` still serves the legacy
   single-page files and an in-memory `/cart` API. Safe to remove once the
   storefront is confirmed live.
8. **Security hardening** — no rate limiting on auth endpoints, no security
   headers (helmet), JWTs in `localStorage`. (See §7 Security audit.)

---

## 5. Current-state audit

### CUSTOMER STOREFRONT (`frontend/`)

| Area | Status | Notes |
|---|---|---|
| Registration | DONE | `register` → `/api/customer/auth/register`; validation + error states; ResetPassword/ForgotPassword flows complete. |
| Login | DONE | `/api/customer/auth/login`; 401 → central logout event; redirect-back after login. |
| Profile | DONE | `GET/PUT /api/customer/profile`; ProfileCard, ProfilePage. |
| Addresses | DONE | Full CRUD via `/api/customer/addresses`; AddressModal; default-address promotion. |
| Cart | DONE | Backend-backed (guest `session_id` + user cart), optimistic UI, serialized writes, reconcile on failure. |
| Guest cart | DONE | Persistent guest session; login transition merges guest cart, then clears it. |
| Cart merge | DONE | `POST /api/customer/cart/merge`; guarded by `authorize('customer')`. |
| Checkout | DONE | 3-step flow (shipping → payment → review), full field validation, order-review modal, idempotency key. Requires login (guests redirected to `/login`). |
| Order creation | DONE | `POST /api/customer/orders`; server recomputes totals; stock CAS; rollback. |
| Order history / detail | DONE | `GET /api/customer/orders`, `GET /api/customer/orders/:id`; OrdersPage, OrderCard/Modal, OrderTimeline. |
| Payment | PARTIAL | Method selection only (card/UPI/netbanking/COD); Razorpay row present but **disabled** ("Coming soon"). `payment_status` stays `pending`; no gateway capture. **Deferred by design — do not change.** |
| Wishlist | **MOCKED / PARTIAL** | Complete UI (WishlistContext, WishlistPage, badges, buttons, grid) but **localStorage-only**; no API; not synced to the account. **Sprint 22.4 target.** |
| Product browsing | DONE | Home/Collections/Product pages; gallery, size/color selection, recently viewed, related products, quick view. |
| Search / filter | PARTIAL | Rich UI (SearchOverlay, FilterSidebar, SortDropdown, PriceSlider, CategoryFilter) but **all client-side** over one products fetch; search history in `localStorage` (acceptable — device-local). |
| Account pages | DONE | Dashboard, Orders, Addresses, Profile, Settings (localStorage prefs), Wishlist under `/account/*` behind ProtectedRoute. |

**Storefront localStorage usage:** customer JWT + profile (`authStorage.js`),
guest cart `session_id`, wishlist (`unsorted_wishlist_v1`), search history,
account settings prefs, theme. Only **wishlist** and **settings prefs** hold
account data that should be backend-persisted; the rest is either a session or
genuinely device-local.

### ADMIN (`admin-frontend/`)

| Area | Status | Notes |
|---|---|---|
| Auth / session validation | DONE | JWT in `localStorage`; axios request interceptor; response interceptor 401 → session teardown; `SessionLoading` while validating; `ProtectedRoute`. |
| Dashboard | DONE | Real analytics (Sprint 22.2): stats, sales chart, recent orders, low stock, activity. |
| Products | DONE | List/search/filter/pagination; create/edit modal; Cloudinary image upload; delete confirm. |
| Orders | DONE | List/search/filter/pagination; detail drawer; status + payment updates. |
| Customers | DONE | List/search/filter/pagination; detail drawer (stats, addresses, orders, activity) — Sprint 22.3. |
| Analytics | **PLACEHOLDER** | `AnalyticsPage.jsx` → `return <h1>Analytics</h1>`. |
| Settings | **PLACEHOLDER** | `SettingsPage.jsx` → `return <h1>Settings</h1>`. |
| Uploads / Cloudinary | DONE | `/api/upload` (admin) + `ImageUploader` component. |

### BACKEND (`backend/`)

Full endpoint surface (from `backend/routes/*.js`):

```
GET  /api/health
GET  /api/products             (public)
GET  /api/products/:id         (public)
POST /api/products             admin
PUT  /api/products/:id         admin
DELETE /api/products/:id       admin
GET  /api/admin/products       admin
POST /api/auth/login
GET  /api/auth/me              admin
POST /api/upload               admin (multer + Cloudinary)
POST /api/customer/auth/register, /login, /forgot-password, /reset-password
GET  /api/customer/auth/me     customer
GET  /api/customer/profile     customer
PUT  /api/customer/profile     customer
GET/POST/PUT/DELETE /api/customer/addresses[ /:id]   customer
GET  /api/customer/cart        optional auth
POST /api/customer/cart/items  optional auth
PUT/DELETE /api/customer/cart/items/:itemId  optional auth
POST /api/customer/cart/merge  customer
POST /api/customer/orders      customer   (place order)
GET  /api/customer/orders      customer   (history)
GET  /api/customer/orders/:id  customer   (detail)
GET  /api/admin/orders         admin
GET  /api/admin/orders/:id     admin
PATCH /api/admin/orders/:id/status   admin
PATCH /api/admin/orders/:id/payment  admin
GET  /api/admin/dashboard, /stats, /sales, /recent-orders, /low-stock, /best-sellers, /customers, /activity  admin
GET  /api/admin/customers      admin
GET  /api/admin/customers/:id  admin
```

| Area | Status | Notes |
|---|---|---|
| Auth (admin) | DONE | JWT; bcrypt when `ADMIN_PASSWORD_HASH` set. |
| Customer auth | DONE | Register/login/me/forgot/reset; anti-enumeration 401; hashed single-use reset token. |
| Products | DONE | CRUD; read public, write admin. |
| Uploads | DONE | Cloudinary via service-role admin upload. |
| Addresses | DONE | CRUD, ownership-scoped, default promotion. |
| Cart | DONE | Guest + user + merge. |
| Checkout / orders | DONE | Server pricing, CAS stock, idempotency, rollback, ownership-scoped reads. |
| Admin orders | DONE | List/detail/status/payment updates. |
| Admin customers | DONE | List/detail with stats/addresses/orders/activity. |
| Dashboard | DONE | 8 endpoints. |
| **Wishlist API** | **MISSING** | `wishlist` table exists; **no endpoints**. |
| **Categories API** | **MISSING** | `categories` table exists; **no endpoints**. |
| Coupons | **HARDCODED** | `COUPONS` map on frontend + mirrored in backend `computeOrderPricing`; no catalog table/API. |

---

## 6. Payment audit

**Deferred — Razorpay/payment gateway integration will be considered later.**

- The storefront checkout presents Card / UPI / Net Banking / COD as selectable
  methods and a disabled **"Razorpay — Coming soon"** option
  (`useCheckout.js` `PAYMENT_METHODS`).
- Placing an order stores `payment_method` and leaves `payment_status =
  'pending'` (`order.service.js`). There is no capture/verification of any
  payment — this is a deliberately simulated checkout.
- **Action:** leave all payment code untouched in Sprint 22.4. A gateway is
  NOT the highest-priority requirement; the audit recommends the wishlist
  instead. Razorpay remains deferred.

---

## 7. Database audit

### Schema summary (`backend/database/schema.sql`, 288 lines)

Tables: `categories`, `products`, `users`, `addresses`, `wishlist`, `cart`,
`cart_items`, `orders`, `order_items`. Migrations 001 (initial), 002 (customer
auth / reset-token + user RLS), 003 (addresses RLS + one-default index).

### Findings

| Finding | Detail |
|---|---|
| **Unused table** | **`wishlist`** — created in migration 001, never referenced by any route/service/repository. Its columns and `unique(user_id, product_id)` are exactly what the storefront wishlist needs. |
| Tables not exposed by APIs | `wishlist` (none), `categories` (no read endpoint; used indirectly via products). |
| APIs not used by UI | None of consequence — all shipped APIs are consumed by their apps (dashboard endpoints feed the admin dashboard; customer APIs feed the storefront). |
| Missing indexes | No composite `(user_id, placed_at desc)` on `orders` (order history is per-user; existing `idx_orders_user` + `idx_orders_placed_at` suffice at current volume — minor). No `(cart_id, product_id)` on `cart_items` (covered by `unique`). No functional gap today. |
| Missing relationships | No `coupons` table (coupon codes are hardcoded). `orders.coupon_code` is a free-text column. |
| Missing constraints | `cart` allows multiple `active` carts per `user_id` (no unique on `(user_id, status='active')`); the service picks one — acceptable but worth a later note. |
| RLS | RLS is **enabled** on `wishlist`, `cart`, `cart_items`, `orders`, `order_items` but **no policies** exist → anon key gets deny-by-default (secure). Backend uses the service-role key (bypasses RLS). When wishlist is exposed via the customer API, ownership is enforced in the service layer by `req.user.id`, matching how cart/orders/addresses already work. |
| Data-integrity notes | `order_items.product_id` is `on delete set null` — order history snapshots survive product deletion (good). Stock decrement uses CAS and never oversells (verified in 22.3 regression). |

### Migration verdict

- **For the recommended Sprint 22.4 scope (wishlist): NO migration required.**
  The table, unique constraint, and index already exist. No `schema.sql`
  change and no new migration file.
- A migration WOULD be required for: coupon catalog (new `coupons` table),
  store settings (new `settings` table), or product variant/size inventory
  (new columns). None of these are in the recommended scope.

---

## 8. Backend architecture plan (Sprint 22.4 — wishlist)

Follow the established per-domain pattern. Every file below mirrors the
existing `address.*` / `cart.*` modules.

```
routes      wishlist.routes.js        (mount in routes/index.js at /api/customer/wishlist)
controllers wishlist.controller.js    (thin handlers → service)
services    wishlist.service.js       (ownership scoping, product validation, normalize)
repositories wishlist.repository.js   (Supabase queries on public.wishlist)
validators  wishlist.validator.js     (productId allowlist/type checks)
```

- **Auth:** `router.use(authorize('customer'))` at the router level (same as
  `order.routes.js`).
- **Ownership:** every query filters `user_id = req.user.id` — the service
  never trusts client-supplied user ids (same as addresses/cart/orders).
- **Product validation:** add must verify the product exists and is active
  (reuse `findProductById` from `product.repository.js`); return a clean 400/
  404 via `ApiError`.
- **Idempotency:** the `unique(user_id, product_id)` constraint makes add
  naturally idempotent — catch `23505` and return the existing row (or a 409
  with a stable, documented contract; pick one and keep it consistent with the
  storefront).

---

## 9. Frontend architecture plan (Sprint 22.4 — wishlist)

Mirror the Sprint 21.3 cart pattern (localStorage → API-backed with merge):

1. **New `services/wishlist.js`** — `fetchWishlist()`, `addWishlistItem(productId)`,
   `removeWishlistItem(productId)` (and optionally `fetchWishlistIds()` for
   cheap membership sync), all through the shared `request()` client.
2. **`WishlistContext.jsx` (modify)** — when authenticated: load from the API;
   on login: merge the stored guest wishlist (`unsorted_wishlist_v1`) into the
   account wishlist via `POST`, then clear the local copy — the exact flow
   `CartContext` already uses for carts. Guests keep the current
   localStorage store unchanged.
3. **Optimistic UI + reconcile** — same pattern as `CartContext`: apply
   optimistically, enqueue the server write, reconcile from the server on
   failure. Per-item membership (already via `useSyncExternalStore`) is
   preserved.
4. **`WishlistPage` / badges / buttons** — no visual change needed; the
   context swap is transparent to consumers.

---

## 10. Files to create

### Backend
- `backend/validators/wishlist.validator.js`
- `backend/repositories/wishlist.repository.js`
- `backend/services/wishlist.service.js`
- `backend/controllers/wishlist.controller.js`
- `backend/routes/wishlist.routes.js`

### Storefront
- `frontend/src/services/wishlist.js`

### Audit document
- `SPRINT_22_4_AUDIT.md` (this file — created during the audit only)

---

## 11. Files to modify

- `backend/routes/index.js` — mount `/api/customer/wishlist` (2-line addition).
- `frontend/src/context/WishlistContext.jsx` — API-backed store + login merge.
- `frontend/src/services/wishlistStorage.js` — keep for guest persistence;
  add the merge/clear-on-login hook (or do the merge inside the context).
- (Optional, if sprint scope includes it) `admin-frontend/.../CustomerDetailDrawer`
  or `CustomerStats` — expose the customer's saved items; otherwise untouched.

No `package.json`, no config, no schema, no migration changes.

---

## 12. Files that must NOT be touched

- **All `backend/database/*`** — schema.sql, migrations 001–003. **No migration.**
- **All payment code** — `useCheckout.js`, `PaymentSelector`, `order.service.js`
  pricing, `orders.payment_*` columns, legacy `razorpay_checkout.js`. Razorpay
  is deferred; do not modify payment behavior.
- **Checkout & order placement** — `order.service.js`, `order.validator.js`,
  `order.repository.js`, `CheckoutPage`, `OrderSuccessPage`, `useCheckout`.
- **Customer auth** — `customerAuth.*`, `user.*`, `auth.*` middleware, JWT
  signing/verification.
- **Admin auth & session** — `AuthContext`, `ProtectedRoute`, `api.js`
  interceptors, `storage.js`.
- **Products / Orders / Dashboard / Customers admin modules** — `adminOrder.*`,
  `adminCustomer.*`, `dashboard.*`, `product.*` (unless a change is additive and
  strictly required).
- **Cart & addresses** — `cart.*`, `address.*` (wishlist merge reuses the
  *pattern*, not the modules).
- **Database schema, migrations, config, env, package files.**
- **Anything not listed in §10/§11.**

---

## 13. API contracts (proposed for Sprint 22.4)

All endpoints require `Authorization: Bearer <customer JWT>`.

```
GET    /api/customer/wishlist
  → 200 { success, count, items: [
        { productId, name, price, oldPrice, imageUrl, size?, color?,
          addedAt } ] }
  (product snapshot enriched from products; ownership scoped to caller)

POST   /api/customer/wishlist
  body { productId: number }
  → 201 { success, item }
  → 400 { error }     invalid/missing productId
  → 404 { error }     product not found or inactive
  → 409 { error }     already wishlisted (or 200 idempotent — pick in phase 1)

DELETE /api/customer/wishlist/:productId
  → 200 { success }   removed (idempotent; absent row still succeeds)
  → 400 { error }     invalid productId

OPTIONAL  GET /api/customer/wishlist/ids
  → 200 { ids: number[] }   cheap membership sync for badges
```

Response shape follows the normalized `snake→camel` mapping already used by
the order/address/cart services. Authz matrix to verify in phase 4:
customer JWT → 200; admin JWT → 403; no token → 401; other customer's data →
empty/404 (never cross-tenant rows).

---

## 14. UI/UX plan (Sprint 22.4 — wishlist)

- **No visual redesign.** Wishlist page, grid, badges, buttons, empty state all
  already exist and stay pixel-identical.
- **Behavior change:** wishlists become account-persistent. A logged-in
  customer sees the same wishlist on any device; a guest's local wishlist is
  merged into the account on login (then the local copy is cleared), exactly
  like the cart.
- **Loading/error/empty states:** reuse the existing `WishlistEmpty` empty
  state; add the shared `Loader` while the account wishlist loads and an
  inline retry message on API failure (consistent with `CartContext.error`).
- **Optional admin cross-link:** customer detail drawer shows saved-item count
  / list (read-only). Kept optional to contain scope.

---

## 15. Security considerations

- **Ownership (IDOR):** all wishlist queries scoped to `req.user.id`; never
  accept a `userId` from the client. Do not expose another user's wishlist.
- **Role separation:** customer-only routes guarded by `authorize('customer')`;
  admin JWT must get **403**, not 200 (add to the authz matrix).
- **Product integrity:** only active, existing products can be added; product
  data is enriched server-side (never trust client-supplied product fields).
- **Validation:** `productId` validated/allowlisted in the validator; all
  errors through `ApiError` (400/404/409), no raw Supabase errors surfaced.
- **No sensitive fields:** `users.password_hash` / `reset_token` never enter
  the wishlist response (reuse `USER_SAFE_COLUMNS`-style projection if user
  data is joined; here only product data is joined, so this is moot).
- **RLS:** add nothing schema-side; the service-role key path + service-level
  scoping matches every existing customer module.
- **Rate limiting / brute force:** out of scope for the wishlist; tracked as a
  separate hardening item (§19 deferred).

---

## 16. Data-integrity considerations

- The DB `unique (user_id, product_id)` is the hard invariant — the service
  treats a `23505` add as an idempotent success and returns the existing row.
- On login merge: if a merged product is no longer active/available, the merge
  skips it and continues (never fails the whole merge — same spirit as the
  cart merge).
- No totals/pricing involved (zero money fields) — lower integrity risk than
  cart/orders.
- Deleting a product cascades (`on delete cascade` on `wishlist.product_id`) —
  wishlist rows self-clean; the storefront reconciles missing products from
  the fetch response.

---

## 17. Performance considerations

- List: **1 query** for the wishlist rows + **1 batched query** to enrich
  products (fetch products by `id.in.(...)`), or reuse the module-level
  `useProducts` cache already present in the storefront — no N+1.
- Membership checks use the local React store (already `useSyncExternalStore`
  with per-item subscription) — no per-badge API calls.
- The optional `/ids` endpoint is a single light query for badge sync if the
  enriched list ever feels heavy; default implementation should fetch the
  enriched list once per session, not per badge.
- Keep `fetchWishlist()` cached at module level (like `useProducts`) so
  page/badge consumers share one request per session.

---

## 18. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Cross-tenant read (IDOR) | Low | Mandatory `req.user.id` scoping in repository; covered by authz matrix test. |
| Add/merge race (double add on login) | Low | `unique` constraint + 23505 → idempotent success. |
| Guest wishlist lost on failed merge | Low | Merge inside a try/catch: on failure, keep local copy and surface a retry; never clear before success. |
| Inactive product lingers in account wishlist | Medium | Enrich server-side and drop inactive products from responses; storefront reconciles. |
| Scope creep into payment/coupons | Medium | Explicitly banned in §12; code review gate. |
| Breaking existing wishlist UX | Low | Context API unchanged; only the store backend swaps. |

Overall risk: **LOW–MEDIUM.** No money, no schema change, established pattern
reuse, no migration.

---

## 19. Verification plan

Mirror the Sprint 22.3 Phase-4 audit checklist:

1. **API regression** — list (shape, count, ordering), add (201/400/404/409),
   remove (200/404/400), duplicate add idempotent, inactive/missing product.
2. **Authz matrix** — no token 401; admin JWT 403 on all wishlist routes;
   customer JWT 200; Customer A cannot read/modify Customer B (404/empty).
3. **N+1 check** — instrumented: list = 1–2 queries, add = 2, remove = 1.
4. **Builds + lint** — `npm run build` + `npm run lint` (admin),
   `npm run build` (storefront), backend boots clean.
5. **Browser flow** — guest add → login → merged; second device login shows the
   same wishlist; remove syncs; badge counts update; offline/localStorage
   fallback still works for guests.
6. **DB baseline** — before/after counts on `wishlist` (no orphan rows, no
   cross-user rows); baseline customers/orders unchanged.
7. **Code-quality scan** — no debug/TODO/mock/secrets in changed files.
8. **Git audit** — only Sprint 22.4 files; no temp scripts; no artifacts.

---

## 20. Implementation roadmap (Sprint 22.4 — wishlist)

- **Phase 1 — Backend API:** validator → repository → service → controller →
  routes (+ mount). Verify with direct API calls + authz matrix.
- **Phase 2 — Storefront sync:** `services/wishlist.js`; rewire
  `WishlistContext` to API for authenticated users; keep guest localStorage.
- **Phase 3 — Login merge:** guest→account merge on login + clear local copy;
  loading/error/empty states for the account wishlist.
- **Phase 4 — Optional admin cross-link:** read-only saved-items section in the
  customer detail drawer (only if the phase is kept in scope).
- **Phase 5 — Regression & pre-commit audit:** full §19 checklist; single
  commit `feat: complete Sprint 22.4 customer wishlist`.

---

## 21. Definition of done

- Wishlist is account-persistent: same items on any device after login.
- Guest wishlist merges into the account on login; nothing is lost.
- Full authz matrix green (401/403/200, no cross-tenant access).
- No N+1; list loads in ≤2 queries.
- Builds + lint pass; backend boots clean; DB baseline unchanged.
- No schema/migration/payment changes; only the files in §10/§11 touched.
- Browser-tested end to end (guest → login → device B).
- Single commit; working tree clean afterward; nothing pushed.

---

## 22. Deferred work

- **Razorpay / payment gateway integration** — deferred (§6). Not part of
  Sprint 22.4.
- **Coupon catalog + admin management** — requires a `coupons` migration; the
  hardcoded `WELCOME10`/`UNFILTERED15` remain for now. Candidate for a later
  sprint.
- **Admin Analytics + Settings pages** — fill the two placeholders. Analytics
  can reuse dashboard APIs; Settings needs a settings data model (migration).
- **Categories API + server-side filtering** — revisit when the catalog grows
  past a single-fetch size.
- **Admin production deployment config + docs.**
- **Security hardening** — rate limiting on auth endpoints, security headers,
  optional httpOnly-cookie sessions (larger change; keep JWT-in-localStorage
  for now).
- **Legacy cleanup** — remove legacy root site files and the in-memory
  `/cart` endpoints from `server.js` once the storefront is confirmed
  deployed.

---

## 23. Razorpay status

**Razorpay / payment gateway integration remains deferred.**
Sprint 22.4 does not touch any payment code, and the disabled "Razorpay —
Coming soon" option in the storefront stays as-is. This audit confirms the
wishlist — not a payment gateway — is the highest-priority next sprint.