# Sprint 22.5 — Discovery & Audit

Status: DISCOVERY / AUDIT ONLY — no implementation performed.
Sprint 22.4 (`144d1e0`) is complete and committed.

## 1. Current state

### Repository baseline
- Branch: `main`
- HEAD: `144d1e0 feat: complete Sprint 22.4 wishlist management`
- Working tree: clean (`nothing to commit, working tree clean`)
- No uncommitted Sprint 22.4 leftovers
- History: 20 commits spanning Sprint 11 → 22.4 (auth → admin auth/upload → customer auth → profile/addresses → cart/checkout/orders → admin order management → live admin dashboard → admin customer management → wishlist)

### Application layout
- `frontend/` — React 18 + Vite 6 storefront (catalog, cart, checkout, wishlist, account dashboard, auth).
- `admin-frontend/` — React 19 + Vite 8 admin dashboard (login, dashboard, products, orders, customers).
- `backend/` — Express 4 + Supabase (PostgREST) + Cloudinary; 53 endpoints; layered routes → controllers → services → repositories → validators.

### Completed functionality
- Customer auth (register/login/logout, JWT 7d, forgot/reset password tokens, profile + address CRUD).
- Storefront: home (hero, featured drops, new arrivals, shop-by-category, brand story, newsletter), collections with client-side filters/search/sort, product detail + quickview, cart (guest localStorage + DB, auth merge), 3-step checkout (shipping → payment → review), order success page, account dashboard (orders, addresses, profile, settings, wishlist, theme).
- Wishlist: guest localStorage + authenticated API + guest→account merge + admin "Saved Items" (Sprint 22.4).
- Admin: login (JWT), live dashboard (stats, sales chart, recent orders, low stock, activity), product CRUD + Cloudinary upload, order management (search/filter/sort/paginate + detail drawer + status/payment updates), customer management (list/search/filter + detail drawer with stats, addresses, wishlist, orders, activity).
- Checkout/orders: server-verified pricing, coupon codes (WELCOME10, UNFILTERED15 hardcoded), delivery options, deterministic `order_number` + idempotent replay, CAS stock decrement, order snapshots, order success screen.

### Explicitly deferred (by prior sprints)
- Razorpay / payment gateway integration — intentionally deferred; `payment_method` stored, `payment_status` stays `pending`. Not recommended for 22.5.
- Email delivery (order confirmation, reset links) — no mailer exists.
- Guest checkout — orders require login by design.

---

## 2. Candidate features (ranked)

Ranked on: customer/business value, production importance, dependency readiness, implementation risk, reusable infrastructure, DB support, phase-isolatability.

| # | Candidate | Value | Production importance | DB support | Migration | Risk | Reuse | Verdict |
|---|-----------|-------|----------------------|-----------|-----------|------|-------|---------|
| 1 | **Customer order self-service** (cancel + real status timeline + track + invoice) | High | High | Mostly (`cancelled` in enum; history needs small table) | 004 (optional) | Medium | High (order module, restoreStock, adminOrder, timeline UIs) | **Recommended** |
| 2 | Security hardening (rate limiting, helmet, admin password hash, remove legacy `/cart`) | Low | High | n/a | none | Low | Medium | Strong follow-up |
| 3 | Categories management (admin CRUD + data-driven shop-by-category) | Medium | Medium | Yes (`categories` has image_url/description/is_active/sort_order unused) | none | Low | High (products module pattern) | Good quick win |
| 4 | Product reviews & ratings | High | Medium | Partial (aggregate columns only) | 005 (reviews) | Medium | Low | Growth feature |
| 5 | Coupon management (coupons table + admin CRUD + server validation) | Medium | Medium | Partial (`coupon_code` column only) | 006 (coupons) | Medium | Medium | Follow-up |
| 6 | Email/notification service (order + reset emails, newsletter) | Medium | High | Newsletter: none | 007 (optional) | Medium | Low (new external dep) | Needs provider + env |
| 7 | Checkout UX (select saved address; guest checkout) | Medium | Medium | Yes | none | Low-Medium | High | Small wins |
| 8 | Automated testing + CI (vitest/supertest + GitHub Actions) | Low | High | n/a | none | Medium | Low | Cross-cutting, large |
| 9 | Deployment readiness (render.yaml, admin env handling, docs) | Low | High | n/a | none | Low | Low | Ops sprint |

---

## 3. Database audit

Canonical schema: `backend/database/schema.sql` (288 lines) + 3 migrations in `backend/database/migrations/` (`001_initial_schema.sql`, `002_customer_auth.sql`, `003_addresses.sql`). No enum types (statuses are `text` + CHECK).

### Tables (9)
- `categories` (id, name, slug UNIQUE, description, image_url, is_active, sort_order, timestamps) — **description / image_url / is_active / sort_order are never written or read by any code**; only id/name/slug are used.
- `products` (id, category_id FK→categories SET NULL, name, slug UNIQUE, description, price, old_price, image_url, **image_gallery jsonb**, stock_quantity, **is_sale**, **is_new**, is_active, **rating numeric(2,1)**, **rating_count int**, timestamps).
  - Unused columns: `image_gallery` (storefront gallery always falls back to a nonexistent `imageUrl2`), `is_new` (UI heuristic `isNew={index<3}`), `rating`/`rating_count` (storefront fabricates ratings via `utils/productRating.js:1-8`). Columns already exist — upgrade path exists without breaking changes.
- `users` (uuid, email citext UNIQUE, password_hash, first/last_name, phone, avatar_url, role CHECK(customer,admin), is_active, last_login_at, reset_token + expires, timestamps).
- `addresses` (uuid, user_id FK CASCADE, name/phone/address/city/state/pincode/country, is_default, timestamps; partial UNIQUE index one-default).
- `wishlist` (uuid, user_id FK CASCADE, product_id FK CASCADE, UNIQUE(user_id, product_id)).
- `cart` (uuid, user_id FK CASCADE nullable, session_id nullable, status CHECK(active,abandoned,checked_out); table CHECK user_id OR session_id).
- `cart_items` (uuid, cart_id FK CASCADE, product_id FK CASCADE, size/color/color_name, quantity CHECK>0, UNIQUE(cart_id, product_id, size, color)).
- `orders` (uuid, user_id FK SET NULL, order_number UNIQUE, status CHECK(pending,confirmed,processing,shipped,delivered,cancelled,refunded), payment_status CHECK(pending,paid,failed,refunded), payment_method, subtotal/discount/shipping/tax/grand_total, currency default INR, coupon_code, shipping_address jsonb, contact jsonb, placed_at, timestamps).
- `order_items` (uuid, order_id FK CASCADE, product_id FK SET NULL, name, price_at_order, image_url, size/color/color_name, quantity, created_at).

### Indexes / constraints / relationships
- 16 indexes incl. `idx_orders_status`, `idx_orders_payment_status`, `idx_orders_placed_at` DESC, `idx_wishlist_user`, `idx_cart_session`, partial UNIQUE `idx_users_reset_token`, partial UNIQUE one-default address.
- Trigger `set_updated_at()` on all tables with `updated_at` (not on `order_items`).
- RLS enabled on all 9 tables (public-read on categories/products; own-row on users/addresses). The backend runs under the **service-role key which bypasses RLS** — row isolation is enforced in application code.

### Migration requirement per candidate
- **Order self-service**: cancellation needs **no schema change** (`orders.status` CHECK already includes `cancelled`; stock restore is app logic — `restoreStock` exists at `order.repository.js:268-289`). A truthful status timeline wants one **additive** migration: `order_status_history(order_id FK CASCADE, status, by_role, created_at)` + index on `order_id`. Deferrable — cancellation ships without it.
- Categories management: **no migration** (columns already exist).
- Reviews/ratings: migration (reviews table + UNIQUE(user_id, product_id) + rating recompute) required.
- Coupons: migration (coupons table) required.
- Newsletter: migration (newsletter table) required if the widget becomes real.
- Nothing else requires schema change.

### Security/constraint concerns
- `orders.user_id` is nullable (supports future guest checkout) but placement currently requires auth.
- Admin status updates are an **unconditional UPDATE** (`adminOrder.repository.js:93-106`) — no transition state machine, no stock restoration when an admin sets `cancelled`/`refunded`.
- Service-role key usage means any future repo query that forgets `.eq('user_id', ...)` would read all rows — operational constraint to keep documenting.

---

## 4. Backend architecture audit

### Layer pattern (Sprint 20–22, reusable)
routes → controllers → services → repositories → validators → Supabase. Every service returns `{ok, data, reason, code}` with Postgres code mapping (23505 → replay/409). `ApiError` + centralized `errorHandler` (expose-flag; production never leaks DB messages/stacks). `toDbError` is duplicated verbatim across 10 services (extraction candidate, not required).

### Reusable modules
- **Auth**: `services/auth.service.js` (admin JWT 1d), `services/customerAuth.service.js` (customer JWT 7d, bcrypt rounds 10, reset tokens); `middleware/auth.middleware.js` (`authenticate`, `authorize('admin'|'customer')`).
- **Products**: repository with category join + active filter; `validateProductPayload`; controller handlers. Public `GET /api/products` takes no query params (search/filter/pagination is client-side).
- **Cart**: session + user carts, `optionalAuth`, merge, `MAX_ITEM_QTY=10`.
- **Orders**: `order.service.js` — validate, idempotent replay (deterministic `order_number`), active-cart load, verify products + **recompute pricing server-side** (`computeOrderPricing`), CAS stock decrement with retry + compensation, insert order + items, mark cart `checked_out`. **`restoreStock` exists and is directly reusable for cancellation.**
- **Admin orders**: list (page/limit/search/status/payment/sort allow-listed), detail, status + payment PATCH.
- **Dashboard**: 8 endpoints, bounded params, fully live.
- **Admin customers**: paginated list (handles PostgREST PGRST103 overflow), detail, wishlist.
- **Wishlist**: customer CRUD (idempotent add via 23505 replay), admin Saved Items view.
- **Addresses**: full CRUD + one-default invariant + RLS.
- **Upload/Cloudinary**: `POST /api/upload` (admin, multer memory, 5MB, MIME whitelist) — contract-level (frontend uploads then submits `secureUrl`).
- **Pagination pattern**: PostgREST `range()` + exact count.

### Incomplete backend
- No `/api/products/search`; no public-products or customer-orders pagination (fine at small scale).
- No customer-initiated order cancellation (customer routes expose only POST `/`, GET `/`, GET `/:id`).
- No order status history / per-status timestamps.
- No email/mailer service; reset link is logged in dev / `{success:true}` in prod.
- Legacy in-memory `/cart*` endpoints in `server.js:125-181` (unauthenticated, global mutable array) — dead legacy from the old monolithic site.
- `backend/scripts/` empty; stale `backend.log` / `wishlist-backend-p2.log` on disk (gitignored).

---

## 5. Storefront audit

Routes (`router/AppRouter.jsx`): `/` Home, `/collections(/:categoryId)`, `/product/:productId`, `/wishlist`, `/cart`, `/checkout`, `/checkout/success`, `/login`, `/register`, `/forgot-password`, `/reset-password`, plus protected `/account` (dashboard, orders, wishlist, addresses, profile, settings). All pages code-split.

### Findings
| Severity | Finding | Evidence |
|---|---|---|
| MEDIUM | **Ratings are fabricated** — deterministic pseudo-ratings derived from product id; `products.rating/rating_count` exist but are never populated. Fake social proof in production. | `utils/productRating.js:1-8` |
| MEDIUM | **Product gallery is dead** — ProductPage/ProductCard/QuickView reference `imageUrl2`/`secondaryImageUrl`/`image_gallery` that the backend never returns; gallery always empty. | `ProductPage.jsx:164`, `ProductCard.jsx:35`, `QuickView.jsx:42` |
| MEDIUM | **Order success page promises an email that is never sent** — "a confirmation email is on its way"; no mailer exists anywhere. | `OrderSuccessPage.jsx:77-79` |
| MEDIUM | **Forgot-password is effectively broken in prod** — reset link only logged in dev; prod returns `{success:true}` with no email; page itself is a "mock success state". | `ForgotPasswordPage.jsx:6`, `customerAuth.service.js:209-215` |
| MEDIUM | **Track Order / Download Invoice are disabled placeholders** — `aria-disabled` buttons, "arrives with a backend" tooltips. | `OrderCard.jsx:69-84` |
| MEDIUM | **No order cancellation** — customer orders are read-only; no cancel endpoint/button anywhere. | `OrderCard.jsx`, `OrderModal.jsx`, `order.routes.js` |
| MEDIUM | **Timeline is not truthful** — derived purely from the single `orders.status`; no per-status timestamps. | `OrderModal.jsx:165`, `OrderTimeline` |
| MEDIUM | **Shop-by-category is hardcoded** — static array (names + Cloudinary image URLs), not driven by the `categories` table which has unused columns for exactly this. | `ShopByCategory.jsx:7-38` |
| LOW | **Newsletter is UI-only** — local `setSubmitted` state, no API call, no persistence. | `Newsletter.jsx:10-13` |
| LOW | **New arrivals heuristic** — `isNew={index<3}`; `products.is_new` unused. | `NewArrivals.jsx:77` |
| LOW | **Checkout can't reuse saved addresses** — AddressesPage CRUD complete, but the checkout shipping form is standalone (no picker). | `CheckoutForm.jsx`, `AddressesPage.jsx` |
| LOW | **Social login placeholder** — no provider backend. | `SocialLogin.jsx:61` |
| LOW | **Stale comments** — LoginForm/RegisterForm/ProfileDropdown comments still say "mock"/"placeholder" while functionality is real (cosmetic). | `LoginForm.jsx:11`, `RegisterForm.jsx:10`, `ProfileDropdown.jsx:22` |
| LOW | **Search is client-side only** — filters already-fetched products; acceptable at small catalog scale. | `useSearch.js` |
| n/a | Razorpay radio disabled "Coming soon" (`useCheckout.js:38`) — **deferred by design, not a defect.** | `useCheckout.js` |

### Not gaps
- Guest wishlist localStorage → auth merge (22.4), cart guest/auth/merge, addresses CRUD, profile update, order success: fully implemented.

---

## 6. Admin audit

Routes (`routes/AppRoutes.jsx`): `/` login, `/dashboard`, `/products`, `/orders`, `/customers`, plus **placeholder** `/analytics` and `/settings`.

### Findings
| Severity | Finding | Evidence |
|---|---|---|
| MEDIUM | **Analytics page is a bare `<h1>Analytics</h1>`** reachable from sidebar + quick actions; dashboard payload already carries `bestSellers` + `latestCustomers` that nothing renders. | `AnalyticsPage.jsx:1-3` |
| MEDIUM | **Settings page is a bare `<h1>Settings</h1>`** reachable from sidebar. | `SettingsPage.jsx:1-3` |
| MEDIUM | **Topbar global search is non-functional** — no state, no onChange, no submit, no results. | `Topbar.jsx:21-28` |
| MEDIUM | **Product sizes/colors are collected but never sent** — modal omits them; comment admits backend doesn't store them. Silent no-op. | `ProductModal.jsx:103-112` |
| MEDIUM | **Customer module is read-only** — no edit/delete/status-change/address-management actions; "no add/edit/delete actions are offered". | `customer.service.js`, `CustomerAddresses.jsx:3-7` |
| MEDIUM | **Sidebar hidden from assistive tech on desktop** — `aria-hidden={!open}` while CSS shows nav ≥1024px. | `Sidebar.jsx:30-32`, `AdminLayout.jsx:12` |
| LOW | **Admin order timeline has no real timestamps** — milestone dates always null. | `orderStatus.js:89-118` |
| LOW | **Order notes read-only** — no add/edit-notes. | `OrderDetailDrawer.jsx:373-376` |
| LOW | **No inactive/hidden product filter**; `deriveProductStatus` ignores `is_active`. | `productStatus.js:12-17` |
| LOW | **No bulk order actions / export**; **notification bell has no onClick**; **"Remember me" cosmetic**; **dead code** (`ui/Card.jsx`, `getStoredUser`, `clearSessionMessage`); **customer orders not clickable**. | various |
| MEDIUM | **No automated tests / no lint/CI for admin** — scripts only dev/build/lint/preview; no test framework. | admin `package.json` |

### Not gaps
- Products CRUD complete (list/create/edit/delete/upload/activate/stock).
- Orders complete (search/filters/sort/pagination/detail/status+payment updates).
- Customers list/detail complete (search/status filter/sort/pagination; stats, addresses, Saved Items, orders, activity).
- Dashboard fully live (no mocked widgets).
- `admin-frontend/.env` is **gitignored and not tracked** (verified via `git ls-files` — only `backend/.env.example` is tracked). Deployment risk is limited: a plain `vite build` would inline whatever `VITE_API_URL` is on disk (defaulting to `localhost:3001`); a production build must use `/api` or the deployed URL. Needs `.env.production` or removal before deploy.

---

## 7. Security / production readiness audit

### Actual blockers
| Severity | Finding | Evidence |
|---|---|---|
| HIGH | **No rate limiting on any auth endpoint** — login/register/forgot/reset are brute-force and abuse-open. | `auth.routes.js:13`, `customerAuth.routes.js:24-28`; `express-rate-limit` absent |
| HIGH | **Admin auth uses plaintext fallback** — `ADMIN_PASSWORD` default `admin123`, `.env` stores plaintext; `ADMIN_PASSWORD_HASH` unset. A deployed admin authenticates by plaintext env value. | `config/env.js:42`, `services/auth.service.js:57-64` |

### Medium-risk technical debt
| Severity | Finding | Evidence |
|---|---|---|
| MEDIUM | **No security headers** — no helmet: no HSTS / X-Content-Type-Options / X-Frame-Options / CSP. | `server.js` |
| MEDIUM | **Single JWT secret for admin + customer token families** — role trusted from signed payload; revocation impossible per family. | `auth.service.js:93`, `customerAuth.service.js:66` |
| MEDIUM | **Guest cart guarded only by client-supplied `sessionId`** (UUID format check) — guessable/adoptable; no cookie or secret. Cart data only, no PII. | `controllers/cart.controller.js:23-27`, `cart.validator.js:40-49` |
| MEDIUM | **Service-role Supabase key used for all queries (RLS bypass)** — isolation is app-code-only; a missed `.eq('user_id')` reads all rows. | `database/client.js:23`, `config/index.js:29` |
| MEDIUM | **Admin order status updates don't restore stock or validate transitions** — `cancelled`/`refunded` set unconditionally. | `adminOrder.repository.js:93-106` |

### Optional hardening (no blockers)
- JWT + PII in localStorage (SPA tradeoff); no server-side token revocation.
- Dev-mode `errorHandler` exposes `err.detail` (Supabase messages) — dev-only.
- Direct `process.env` reads outside `config/`; orphan `SESSION_SECRET` env var.
- Legacy unauthenticated in-memory `/cart*` endpoints (dead legacy; should be removed).
- `admin-frontend/.env` (gitignored) can bake `localhost:3001` into prod builds if deployed with it present.

---

## 8. Deployment audit

- `vercel.json` (repo root) rewrites `/api/(.*)` → `https://unsorted-backend.onrender.com/api/$1` — backend is implicitly deployed on Render.
- **Backend has no render.yaml, Dockerfile, Procfile, or CI** — relies on Render's defaults (`npm install && npm start`).
- `frontend` builds cleanly (verified each sprint). `admin-frontend` builds cleanly but has no `.env.production` (see §6).
- `.env.example` (backend) covers all required keys; `.env` files are gitignored; only `.env.example` is tracked.
- CORS allow-list is env-driven (`CORS_ORIGINS`) with sensible dev defaults; `FRONTEND_URL` present.
- Deployment documentation: **none** (no README deployment section).
- **Verdict**: deployment is not blocked, but a deployment-readiness pass (render.yaml, CI, admin env handling, docs) is a legitimate later sprint; it is not the best next feature sprint.

---

## 9. Automated testing audit

- `frontend/package.json`: `dev`, `build`, `preview` only — **no test script, no framework, no CI**.
- `admin-frontend/package.json`: `dev`, `build`, `lint`, `preview` — lint only, **no test script, no framework, no CI**.
- `backend/package.json`: `dev`, `start` only — **no test/lint, no framework** (no jest/vitest/supertest), **zero test files**.
- No `.github/` anywhere; no CI configuration in the repo.
- **Verdict**: zero automated coverage across all three packages. Important for production readiness, but adding a framework + CI is cross-cutting, time-heavy, and not user-facing — a reasonable sprint after the recommended feature sprint, not before it.

---

## 10. Legacy / technical debt audit

| Severity | Item | Location | Risk |
|---|---|---|---|
| MEDIUM | Legacy in-memory `/cart*` endpoints (global mutable array, unauthenticated) still served by the backend — the old monolithic site's cart, fully superseded by the DB cart. | `server.js:125-181` | Unauthenticated global mutable state reachable on the deployed server; should be removed with the legacy static site. |
| LOW | Legacy root static site served at `/`: `index.html`, `script.js`, `style.css`, `checkout_patch.js`, `razorpay_checkout.js` (posts to old `/cart`). Harmless legacy, but Razorpay stubs imply payment that does not exist. | repo root, `server.js:115-118` | Cosmetic/dead; remove or gate behind a maintenance flag. |
| LOW | Duplicated `toDbError` (10 services), duplicated `COUPONS` map (backend validator + `useCheckout.js`), `PAYMENT_METHODS` duplicated (backend validator + storefront). | backend services, `useCheckout.js`, validators | Consistency risk only. |
| LOW | Stale comments claiming "mock auth"/"placeholder orders" in storefront auth components. | `LoginForm.jsx`, `RegisterForm.jsx`, `ProfileDropdown.jsx` | Cosmetic. |
| LOW | Unused columns: `products.image_gallery/is_new/rating/rating_count`, `categories.image_url/description/is_active/sort_order`, `cart.status='abandoned'`, `orders.status='confirmed'/'refunded'`, `payment_status='failed'/'refunded'`. | schema | None; upgrade paths. |
| LOW | Unused env `SESSION_SECRET`; `backend/scripts/` empty; stale gitignored logs. | backend | None. |
| LOW | Admin dead code: `ui/Card.jsx`, `storage.js getStoredUser()`, `clearSessionMessage`. | admin-frontend | None. |

No legacy component creates an actual production data risk (the `/cart` endpoints and root static files are the only items worth removing).

---

## 11. Recommended Sprint 22.5 — Customer Order Self-Service

**Feature**: give customers control over their orders — cancel before shipping (with stock restore), a truthful status timeline (Track Order), and a printable invoice/receipt. Also makes the admin order timeline truthful.

### Why this was selected (evidence-based)
1. **Existing infrastructure**: the order module is the most complete backend surface (verified pricing, CAS stock, idempotent replay, snapshots) and `restoreStock` already exists (`order.repository.js:268-289`). Admin order status PATCH + validators + both timeline UIs already exist.
2. **DB already supports the core**: `orders.status` CHECK includes `cancelled`; cancellation needs **no schema change**. The only migration is an additive `order_status_history` table for truthful timestamps — deferrable.
3. **Meaningful production value**: completes the core e-commerce loop (buy → track → cancel → invoice), which is a trust/retention feature customers expect; also fixes the storefront's fake "Track Order / Download Invoice" placeholders and the false "email on its way" claim (by removing the need to promise it).
4. **Layered and isolated**: additive endpoints; checkout placement path untouched (only an additive history insert); admin/customer regressions easily isolated.
5. **No Razorpay required**: cancellation, tracking, and invoicing are entirely gateway-independent.
6. **No risky rewrite**: pure additive feature on existing patterns.
7. **Risks are manageable** (see §17).

### Why not the others
- Security hardening (candidate 2) is high-importance but low user value and mostly one-shot fixes; best as the immediate follow-up sprint.
- Categories management (candidate 3) is a good quick win but lower customer value than order self-service.
- Reviews/coupons/email/guest-checkout (candidates 4–7) need migrations or new external providers and build on the order loop rather than completing it.
- Testing/CI and deployment (candidates 8–9) are valuable but not the highest-value feature work.

---

## 12. Architecture plan

Backend (additive to the existing layered pattern):
- New `orderHistory` module (repository + service) recording every status/payment transition: `{order_id, status, by_role ('customer'|'admin'|'system'), created_at}`. History is written on: placement (`pending`), admin status PATCH, admin payment PATCH, customer cancel.
- New customer cancel flow reusing the existing `restoreStock` helper and `ApiError`/`{ok,data,reason,code}` conventions:
  1. Ownership check (order must belong to `req.user.id`).
  2. Guard: only `pending` / `confirmed` / `processing` can be cancelled; `shipped`/`delivered` → 400.
  3. Idempotent: already `cancelled` → 200 no-op.
  4. Set `status = 'cancelled'`, record history, restore stock per line.
  5. Return the normalized order (same shape as existing detail) + `history`.
- Order detail (`GET /api/customer/orders/:id`) and admin detail gain an additive `history` array — no shape break for existing consumers.
- Migration `004_order_status_history.sql` (created in this sprint only; **not applied during this audit**).

Frontend (storefront):
- Enable "Track Order" → opens the existing OrderModal with a real timeline from `order.history`.
- Enable "Download Invoice" → printable receipt (new InvoiceModal, print CSS) built entirely from existing order data (no backend change).
- Add "Cancel Order" (confirm dialog) on OrderCard/OrderModal when status is cancellable; after success, refresh the list.
- `OrderTimeline` renders `history` when present, else the current derived fallback.

Admin (small, optional phase):
- `OrderDetailDrawer` timeline renders `history` timestamps (fixes the "no real timestamps" finding) — same additive contract.

---

## 13. API design

### 13.1 Cancel order
```
PATCH /api/customer/orders/:id/cancel        (authorize('customer'))
Request body: none (or { "note": string? })
Success 200: { success: true, order: { ...normalizedOrder, status: 'cancelled', history: [...] } }
401  no/invalid token
404  order not found or not owned by caller   (same parse/ownership rules as GET /orders/:id)
400  order not cancellable (shipped/delivered/refunded)
200  idempotent replay when already cancelled
Side effects: orders.status='cancelled'; order_status_history row (by_role='customer'); stock restored per order_item line.
```
Cancellable statuses: `pending`, `confirmed`, `processing`.

### 13.2 Order history (additive, no shape break)
- `GET /api/customer/orders/:id` response gains `order.history: [{ status, by, at }]`.
- `GET /api/admin/orders/:id` response gains `order.history`.
- History also recorded when admin calls `PATCH /api/admin/orders/:id/status` and `/payment`.

### 13.3 Migration 004_order_status_history.sql (in-sprint, not applied now)
```sql
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  by_role text not null check (by_role in ('customer','admin','system')),
  created_at timestamptz not null default now()
);
create index if not exists idx_order_status_history_order on public.order_status_history(order_id);
```
Backfill: existing orders get one history row from `placed_at` with `status='pending'`, `by_role='system'`.

---

## 14. Files to create
- `backend/database/migrations/004_order_status_history.sql`
- `backend/repositories/orderHistory.repository.js`
- `backend/services/orderHistory.service.js`
- `frontend/src/components/account/OrderCancelModal/OrderCancelModal.jsx` (+ `.module.css`)
- `frontend/src/components/account/InvoiceModal/InvoiceModal.jsx` (+ `.module.css`) — printable receipt
- `SPRINT_22_5_AUDIT.md` (this document — already created)

## 15. Files to modify
Backend:
- `backend/routes/order.routes.js` — add `PATCH /:id/cancel`
- `backend/controllers/order.controller.js` — `cancelOrder` handler; attach `history` in detail response
- `backend/services/order.service.js` — `cancelOrder` (guard + restore stock + record history); additive history insert on placement
- `backend/repositories/order.repository.js` — `restoreStock` reuse; add cancel status update; load history
- `backend/controllers/adminOrder.controller.js`, `backend/services/adminOrder.service.js`, `backend/repositories/adminOrder.repository.js` — record history on status/payment PATCH; attach history to detail

Frontend (storefront):
- `frontend/src/services/orders.js` — `cancelOrder(id)`
- `frontend/src/components/orders/OrderTimeline/OrderTimeline.jsx` — render `history` when present
- `frontend/src/components/dashboard/OrderCard/OrderCard.jsx` — wire Track Order (open modal) + Download Invoice (open InvoiceModal) + Cancel
- `frontend/src/components/dashboard/OrderModal/OrderModal.jsx` — real timeline, Cancel Order button with confirm
- `frontend/src/pages/OrdersPage/OrdersPage.jsx` — refresh after cancel/invoice actions

Admin (optional phase):
- `admin-frontend/src/components/orders/OrderDetailDrawer.jsx` + `admin-frontend/src/utils/orderStatus.js` — render `history` timestamps

## 16. Files that MUST NOT be touched
- Customer auth + admin auth: `backend/{routes,controllers,services,repositories,validators}/auth*`, `customerAuth*`, `user.*`, `middleware/auth.middleware.js`
- Cart: `backend/{routes,controllers,services,repositories,validators}/cart.*`, `frontend/src/context/CartContext.jsx`, `hooks/useCart.js`, `services/cart.js`, `utils/cartConfig.js`
- Checkout placement core: `backend/validators/order.validator.js` (PAYMENT_METHODS, computeOrderPricing, idempotency), the `createOrder` happy path in `order.service.js` (only the additive history insert is allowed), `POST /api/customer/orders`
- Wishlist: `backend/{routes,controllers,services,repositories,validators}/wishlist.*`, `adminCustomer.*`, `frontend/src/context/WishlistContext.jsx`, `services/wishlist*.js`, `admin-frontend .../CustomerWishlist.jsx`
- Products: `backend/{routes,controllers,services,repositories,validators}/product.*`, `upload.*`, Cloudinary module
- Addresses: `backend/{routes,controllers,services,repositories,validators}/address.*`, `frontend/src/pages/AddressesPage.jsx`, `services/addresses.js`
- Dashboard: `backend/{routes,controllers,services,repositories,validators}/dashboard.*`
- Admin customers: `adminCustomer.*` (beyond already-in-scope history? none — keep untouched)
- Existing database schema + migrations `001–003`; no data writes during implementation beyond new history rows and the cancel status change
- No `.env` files, no gitignore changes, no deployment config changes

---

## 17. Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cancellation races a concurrent checkout placing/restoring stock on the same product | Low | Stock drift | Reuse the existing CAS decrement pattern; restore via the same `restoreStock` with a verification read; order-level checks run within the same transaction-style sequence as `createOrder`. |
| `cancelled`/`refunded` set by admin without stock restore (pre-existing) | Medium | Stock drift | Out of scope to fix silently; the sprint records history for admin transitions but does NOT change admin transition rules (guardrail). Note as follow-up hardening. |
| Adding history to `createOrder` touching the protected checkout path | Medium | Checkout regression | Change is strictly additive (single insert after order insert); regression suite re-verifies placement + replay. |
| Order detail shape change breaks existing consumers | Low | Storefront/admin break | `history` is additive; existing fields untouched. Regression asserts the full contract shape. |
| Migration backfill on existing orders | Low | Data issue | Idempotent `if not exists` + backfill in the same migration; verified against a copy/baseline. |
| UI: accidental cancel taps | Medium | User annoyance | Confirm dialog + cancellable-status gating; cancel only offered pre-shipping. |

## 18. Verification plan
API (runtime checks, backend on 3001, temp QA data then baseline restore):
- Cancel: `pending`→`cancelled` 200; repeat → 200 idempotent; `shipped`/`delivered` → 400; other customer's order → 404; no token → 401; customer token on admin routes unchanged.
- Stock: line quantities restored exactly (compare before/after on product rows); double-cancel restores once only.
- History: row created for placement (pending/system), customer cancel (customer), admin status PATCH (admin), admin payment PATCH (admin); order detail includes `history` for customer and admin.
- Contract: existing `GET /orders/:id` field shape unchanged + additive `history`.
- Regression: checkout placement creates order + history + still idempotent; cart unaffected; wishlist unaffected; admin orders list/detail/status/payment unaffected; dashboard aggregates unaffected (cancelled orders already excluded from sales).
Browser:
- Storefront: Orders list → cancel → confirm → status updates + stock reflected; Track Order shows real timeline; Download Invoice prints receipt; no console/page errors.
- Admin: OrderDetailDrawer shows timestamps; no regression in status/payment update.
Baseline: restore DB state (orders=2, carts=6, wishlist=5, customers=2, product stock) after tests.

## 19. Phased roadmap
- **Phase 1 — Backend foundation**: migration `004_order_status_history.sql` + `orderHistory` repository/service (record + read + backfill read). Files: create 2, add 0. Verify: history repo unit via API.
- **Phase 2 — Backend APIs**: `PATCH /api/customer/orders/:id/cancel` + history recording on placement/admin PATCH + `history` in customer/admin detail. Files: modify `order.routes.js`, `order.controller.js`, `order.service.js`, `order.repository.js`, `adminOrder.{controller,service,repository}.js`. Verify: cancel matrix + history rows (API).
- **Phase 3 — Storefront service + UI integration**: `services/orders.js cancelOrder`; `OrderCard`/`OrderModal` cancel + Track Order + timeline from history. Files: modify 3–4. Verify: browser flows.
- **Phase 4 — Invoice/receipt**: `InvoiceModal` printable receipt + wire "Download Invoice". Files: create 2, modify `OrderCard`. Verify: browser print.
- **Phase 5 — Admin integration (optional)**: render `history` timestamps in `OrderDetailDrawer`/`orderStatus.js`. Verify: admin browser.
- **Phase 6 — Regression**: full API matrix + storefront/admin browser passes + baseline restore + builds (`frontend` build, `admin-frontend` lint+build, backend health).
- **Phase 7 — Final audit**: write `SPRINT_22_5_FINAL_AUDIT` checklist (mirroring Sprint 22.4's 18-section audit); verify git scope.
- **Phase 8 — Commit**: one clean commit (`feat: complete Sprint 22.5 customer order self-service`); do not push.

## 20. Commit strategy
- Single commit for the whole sprint (matching Sprints 21–22.4 style): `feat: complete Sprint 22.5 customer order self-service`.
- Only intended files staged; `.env`, logs, dist, temp, QA artifacts excluded; `git diff --check` clean before commit.
- `SPRINT_22_5_AUDIT.md` is committed with the sprint (like prior audit docs).
- No push, no Sprint 22.6 start until approved.