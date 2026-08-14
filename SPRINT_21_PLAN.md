# UNSORTED — Sprint 21 Implementation Plan

**Status:** Draft for approval — no code has been written.
**Base commit:** `3e24cb7` ("feat: complete Sprint 20 admin auth upload and Cloudinary integration") — working tree clean.
**Stack:** React (frontend) · React (admin-frontend) · Express (backend) · Supabase (PostgreSQL) · Cloudinary (images) · JWT (auth) · legacy landing page at repo root.

---

## 0. Audit Summary

The Sprint 20 codebase is **layered, consistent, and clean** on the backend, and **visually complete but heavily mocked** on the storefront.

- **Backend (real):** Express API with a disciplined `routes → controllers → services → repositories → Supabase` flow. JWT admin auth, product CRUD, Cloudinary upload, centralized error handling, CORS allow-lists, health checks. No tests, no rate limiting, no customer endpoints.
- **Admin frontend (mixed):** Real JWT login and real product CRUD + Cloudinary upload. Orders / Customers / Analytics / Settings pages are **empty placeholders**; the Dashboard renders **static mock data**.
- **Storefront (UI-complete, data-mocked):** Every page exists and is polished. But auth, cart, wishlist, orders, addresses, settings, and checkout are **localStorage mocks**. No customer identity exists server-side. No orders are ever persisted. Payments are disabled.

**Single biggest production gap:** the customer identity and order pipeline are entirely client-side. This is the core of Sprint 21.

---

## 1. Current Architecture

### 1.1 Project structure

```
unsorted-v2/                       # Repo root
├─ vercel.json                     # Rewrites /api/* → Render backend (prod storefront host)
├─ index.html                      # Legacy landing page (HTML)
├─ style.css                       # Legacy landing styles
├─ script.js                       # Legacy site logic (fetches backend products)
├─ checkout_patch.js               # Legacy checkout handler (best-effort cart sync)
├─ razorpay_checkout.js            # Legacy Razorpay frontend stub (no server order)
│
├─ backend/                        # Express API (Render, port 3001)
│  ├─ server.js                    # Bootstrap: CORS, static legacy site, in-memory /cart, mounts /api
│  ├─ config/
│  │  ├─ env.js                    # Raw environment loading (dotenv)
│  │  └─ index.js                  # Central typed config object
│  ├─ database/
│  │  ├─ client.js                 # Supabase singleton (service-role preferred)
│  │  ├─ schema.sql                # Canonical schema (reference / rebuild)
│  │  └─ migrations/001_initial_schema.sql
│  ├─ cloudinary/client.js         # Cloudinary singleton
│  ├─ routes/                      # health, product, auth, admin, upload + index aggregator
│  ├─ controllers/                 # health, product, auth, upload (thin)
│  ├─ services/                    # health, connection, product, auth, upload (business logic)
│  ├─ repositories/                # product, health (the ONLY layer touching Supabase)
│  ├─ middleware/                  # auth.middleware (JWT/roles), errorHandler, notFound
│  ├─ validators/                  # product.validator
│  └─ utils/                       # apiError, asyncHandler, logger
│
├─ frontend/                       # Storefront SPA (Vite, port 5173)
│  └─ src/
│     ├─ main.jsx / App.jsx        # Provider stack + router + CartDrawer
│     ├─ router/AppRouter.jsx      # Lazy, code-split routes
│     ├─ layouts/                  # MainLayout, DashboardLayout
│     ├─ pages/                    # Home, Collections, Product, Wishlist, Cart, Checkout,
│     │                            # OrderSuccess, Login, Register, ForgotPassword,
│     │                            # Dashboard, Orders, Addresses, Profile, Settings, NotFound
│     ├─ components/               # feature folders: auth, cart, checkout, dashboard, filter,
│     │                            # home, layout, orders, product, search, ui, wishlist, Navbar, Hero
│     ├─ context/                  # AuthContext, CartContext, WishlistContext, ThemeContext
│     ├─ hooks/                    # useProducts, useFilters, useSearch, useCheckout, useAuth,
│     │                            # useCart, useWishlist, useTheme, useBoolean, useFocusTrap
│     ├─ services/                 # api (fetch + resolveUrl), products (REAL), all *Storage (MOCKS)
│     └─ utils/                    # authValidation, cartConfig, format, productRating, motion, cn
│
└─ admin-frontend/                 # Admin SPA (Vite, port 5174)
   └─ src/
      ├─ main.jsx / App.jsx
      ├─ routes/AppRoutes.jsx      # Login + protected admin shell
      ├─ layouts/AdminLayout.jsx   # Sidebar + Topbar + Outlet
      ├─ pages/                    # Login (real), Dashboard (mock), Products (real),
      │                            # Orders/Customers/Analytics/Settings (placeholders)
      ├─ components/               # products/ (CRUD + upload), dashboard/, layout/, ui/, toast/
      ├─ context/AuthContext.jsx   # JWT in localStorage
      ├─ services/                 # api (axios + Bearer interceptor), auth, product, upload
      └─ utils/                    # storage, productStatus, classNames
```

### 1.2 Folder-by-folder explanation

**Backend** — layered Express monolith. `server.js` bootstraps CORS (dev = any localhost, prod = `CORS_ORIGINS` allow-list), serves the 5 legacy landing files, hosts a small **in-memory cart API** for the legacy site, and mounts `/api`. Every API module follows the same chain: `route (validation) → controller → service → repository → Supabase`. Controllers stay thin, services own business logic (slug uniqueness, category auto-resolution, order math), repositories are the only place Supabase is touched. All errors flow to a single `errorHandler`; DB operations are wrapped with `asyncHandler`.

**Frontend** — SPA. `useProducts()` is the only real backend consumer (module-level cached `GET /api/products`). Everything user-scoped (auth, cart, wishlist, orders, addresses, settings, search history) lives in `localStorage` behind small service wrappers. Contexts expose stable APIs; hooks wrap contexts; pages compose components. Styling is CSS Modules + design tokens + dark/light theme.

**Admin frontend** — SPA. Axios instance attaches the admin JWT on every request. Product management and image upload are fully wired to the backend. Dashboard/Orders/Customers/Analytics/Settings are static or placeholder.

### 1.3 How frontend communicates with backend

- **Dev:** Vite proxy — `/api/* → http://localhost:3001`. `API_BASE = ''` so the browser never does a cross-origin request.
- **Prod:** `API_BASE = https://unsorted-backend.onrender.com` (hardcoded in `services/api.js`); `vercel.json` also rewrites `/api/*` to the same Render host. CORS allow-list must include the deployed storefront origin.
- **Auth header:** the storefront currently sends **no** auth header (no customer token exists). The admin frontend attaches `Authorization: Bearer <token>` via an Axios interceptor.

### 1.4 Authentication flow

- **Admin (complete):** `POST /api/auth/login` (public) validates email/password against `ADMIN_EMAIL`/`ADMIN_PASSWORD` (or bcrypt `ADMIN_PASSWORD_HASH`) → signs JWT (`1d`, claims: id/name/email/role) → frontend stores token + profile in localStorage (`admin_token`, `admin_user`) → every Axios request sends the Bearer header → `authorize('admin')` middleware verifies the token and role → `GET /api/auth/me` restores a session. Logout is purely client-side (stateless JWT).
- **Customer (missing):** there is **no** server-side customer identity. `AuthContext` reads/writes a **plaintext-password user registry in localStorage** with a fake 500ms delay. Anyone can "log in" as any email by editing storage; nothing is persisted to Supabase.

### 1.5 Image upload flow (Sprint 20, complete)

1. Admin clicks the image box in `ProductModal` → hidden `<input type="file">` → `ImageUploader`.
2. Client pre-validates type (JPEG/PNG/WEBP) and size (≤5 MB).
3. `upload.service.js` (admin) posts `multipart/form-data` to `POST /api/upload` with the JWT; Axios interceptor drops the JSON content-type for FormData.
4. Backend `multer` (memory storage) enforces size → `upload.service.js` (backend) validates MIME/size → streams the buffer to Cloudinary (`unsorted/products` folder) → returns `{ secureUrl, publicId }`.
5. `ImageUploader` stores the Cloudinary URL into the product form → saved via `PUT /api/products/:id`. Credentials never leave the server.

### 1.6 Database flow

- Backend uses the **service-role key** (bypasses RLS) via a cached Supabase singleton.
- **Actively used:** `products` + `categories` (public reads, admin writes). Product rows are normalized to a camelCase public shape (`id, name, category, price, oldPrice, imageUrl, stockQuantity, sale, is_active`); `category_id` is resolved from a slug (auto-creating the category row, with rollback compensation).
- **Defined but unused (no repository/service/route):** `users`, `addresses`, `wishlist`, `cart`, `cart_items`, `orders`, `order_items`. All have RLS enabled but **no policies** (only `categories_public_read` and `products_public_read` exist) — they are locked until real auth lands. Schema already anticipates guest checkout (`session_id`), order snapshots (`shipping_address`/`contact` jsonb), and product gallery/rating columns.
- Migration `001_initial_schema.sql` is idempotent and is the canonical schema snapshot; `schema.sql` is the same file's reference copy.

---

## 2. Existing Features (Sprint 20 complete)

Backend:
- ✓ Layered Express architecture (`routes → controllers → services → repositories → Supabase`)
- ✓ Admin JWT authentication + role-guarded routes (`authorize`, `verifyAdmin` alias)
- ✓ `GET /api/auth/me` session restore
- ✓ Product CRUD on Supabase (public read of active products; admin writes)
- ✓ Hidden-product (`is_active`) support — visible only via admin list
- ✓ Category slug auto-resolution + unique-slug generation with retry + rollback
- ✓ Cloudinary image upload (multer memory → Cloudinary, 5 MB / JPG/PNG/WEBP)
- ✓ Centralized error handler + `ApiError` + `asyncHandler`
- ✓ Health endpoint + boot-time Supabase/Cloudinary connectivity check
- ✓ CORS allow-list (dev localhost any-port, prod explicit origins)
- ✓ Legacy site served by the backend + legacy in-memory cart API
- ✓ `.env.example` + README documentation

Admin frontend:
- ✓ Real login/logout + protected admin routes + session restore
- ✓ Products page: list, search, filter (category/status), pagination, add, edit, delete
- ✓ Cloudinary `ImageUploader` with preview + upload progress + error states
- ✓ Toast system, UI kit (Button, Input, Modal, Card, Loader, EmptyState)
- ✓ Dashboard shell (Sidebar/Topbar/AdminLayout) — **mock data**
- ✓ Placeholder pages: Orders, Customers, Analytics, Settings

Storefront:
- ✓ Home, Collections (URL-synced filters/sort/search), Product, Wishlist, Cart, Checkout, OrderSuccess, Login, Register, ForgotPassword, Dashboard, Orders, Addresses, Profile, Settings, NotFound
- ✓ Product catalog fetch (`useProducts` with shared module cache)
- ✓ Client-side search + filters (category, price, sale, in-stock, sort) persisted to URL
- ✓ Cart (localStorage guest cart: size/color variants, qty clamp, free-shipping progress)
- ✓ Wishlist (localStorage, `useSyncExternalStore` per-item subscriptions)
- ✓ Checkout UI — 3-step flow, shipping validation, delivery options, coupons, review modal (frontend only)
- ✓ Order success page (reads last order from localStorage)
- ✓ Auth UI (login/register/forgot/social buttons) — **mock**
- ✓ Dark/light theme, design tokens, CSS Modules, lazy code-split routes, motion transitions

---

## 3. Missing Features Before Production

### Critical (production blockers)

| # | Feature | Gap |
|---|---------|-----|
| C1 | **Customer authentication** | No server-side register/login/logout. `AuthContext` is a plaintext localStorage mock. |
| C2 | **Customer session security** | No JWT for customers, no 401 handling, no token storage strategy. |
| C3 | **Server-side cart + checkout + order creation** | Orders are never persisted to a backend; `orderStorage.js` is localStorage. |
| C4 | **Stock integrity at checkout** | No server-side stock validation or decrement; price can be tampered client-side. |
| C5 | **Admin order management** | No backend order routes; admin Orders page is a placeholder. |
| C6 | **Payments** | Razorpay is disabled ("Coming soon"); no order creation or signature verification. |
| C7 | **RLS policies for user data** | `users/addresses/wishlist/cart/orders` have RLS on but zero policies. |
| C8 | **Password reset** | UI shows a fake "email sent" state; no reset token flow. |
| C9 | **Production migration + env** | Migration 002 (customer auth/orders) and prod env vars (customer JWT, frontend URL, Razorpay) not configured. |
| C10 | **Security hardening** | No rate limiting, no request-size limits beyond multer, no security headers. |

### Important (needed for a complete, trustworthy product)

| # | Feature | Gap |
|---|---------|-----|
| I1 | Admin Dashboard with live data | Currently static mock in `data/dashboard.js`. |
| I2 | Analytics page | Placeholder `<h1>`. |
| I3 | Customers page | Placeholder `<h1>`. |
| I4 | Settings page | Placeholder `<h1>`. |
| I5 | Product sizes/colors persisted | Admin form collects them but they are dropped ("Not persisted by the backend yet"); storefront sizes are hardcoded. |
| I6 | Real product ratings/reviews | `getProductRating` fabricates ratings from the id; `rating`/`rating_count` columns unused. |
| I7 | Multi-image gallery | `image_gallery` column unused; admin uploads a single image. |
| I8 | Order confirmation email | Success page says "email is on its way" but nothing is sent. |
| I9 | Address book backend sync | localStorage mock with seeded demo address. |
| I10 | Wishlist backend sync | localStorage only; not tied to a user. |
| I11 | Server-side coupons | Hardcoded in `useCheckout`. |
| I12 | Server-side search/pagination | Whole catalog is fetched and filtered client-side. |
| I13 | Newsletter persistence | Submit button just flips a "thanks" state. |
| I14 | Empty/loading/error & a11y polish | Mostly good; inconsistent across pages. |

### Optional (nice-to-have, non-blocking)

1. Social login (Google / GitHub / Apple buttons are placeholders).
2. Guest checkout without an account (schema already supports `session_id`).
3. Recently-viewed persistence (component currently derives from full catalog).
4. Order tracking/timeline (OrderTimeline component exists — wire to real statuses).
5. SEO/OG tags, sitemap, structured data.
6. PWA / offline support.
7. i18n.
8. Store settings (configurable shipping fees, coupons, announcement bar).
9. Email marketing / abandoned-cart flows.
10. Referral / affiliate program.

---

## 4. Sprint 21 Roadmap

Ordered by dependency — each milestone leaves the repo buildable and committed.

```
21A  Customer Authentication            ← foundation (identity)
  ↓
21B  Customer Dashboard & Address Book  ← profile + addresses persisted
  ↓
21C  Cart & Checkout (Order Placement)  ← real cart + orders written to Supabase
  ↓
21D  Order Management (Customer + Admin)← history UI + admin Orders page
  ↓
21E  Wishlist Sync                      ← per-user wishlist
  ↓
21F  Payments (Razorpay)                ← real money flow on top of 21C/21D
  ↓
21G  Product Enhancements + Admin Insights ← sizes/colors/gallery, live Dashboard/Analytics/Customers
  ↓
21H  UI Polish & Production Hardening   ← RLS, rate limiting, headers, a11y, SEO
```

- **21A–21F** clear every Critical item (C1–C8, C10 partial).
- **21G** clears I1–I7.
- **21H** closes the rest (C9/C10 completion, I8–I14, options where chosen).

Each milestone ends with: **✓ Build verification · ✓ Functional verification · ✓ Git status check · ✓ Clean commit**.

---

## 5. Milestone Detail

> Conventions used below: files marked **MODIFY** exist today; files marked **CREATE** are new. Backend endpoints are additive under `/api/customer/*` and `/api/admin/*` so existing admin routes are never broken. All new rows are written through the existing pattern `repository → service → controller → route`, errors through `ApiError` + `asyncHandler`.

### 5.1 Sprint 21A — Customer Authentication

**Purpose.** Give customers a real, persisted identity. Replace the localStorage mock `AuthContext` with Supabase-backed register/login/logout/session restore, issuing JWTs with role `customer`. Also implement forgot/reset password (email transport swappable). This unblocks every later milestone.

**Backend routes**
- `POST /api/customer/auth/register` (public) — bcrypt-hash password, create `users` row, return JWT + profile.
- `POST /api/customer/auth/login` (public) — verify credentials, update `last_login_at`, return JWT + profile.
- `GET  /api/customer/auth/me` (auth) — restore session from token.
- `POST /api/customer/auth/forgot-password` (public) — create reset token, email link (dev: log/return).
- `POST /api/customer/auth/reset-password` (public) — validate token, set new hash.

**Files to create (backend)**
- `backend/routes/customerAuth.routes.js`
- `backend/controllers/customerAuth.controller.js`
- `backend/services/customerAuth.service.js`
- `backend/repositories/user.repository.js`
- `backend/validators/user.validator.js`

**Files to modify (backend)**
- `backend/middleware/auth.middleware.js` — generalize: `verifyToken` stays; add `authenticate()` that attaches `req.auth` (with role), set `req.admin` only when role is `admin`, `req.user` when `customer`; keep `authorize(...roles)` and `verifyAdmin` behavior **identical** for existing admin routes.
- `backend/config/env.js` + `backend/config/index.js` — add `FRONTEND_URL`, `JWT_EXPIRES_IN_CUSTOMER` (`7d`), optional mail config.
- `backend/database/migrations/002_customer_auth.sql` (new migration; also sync `schema.sql`): add `reset_token`/`reset_token_expires_at` to `users`; RLS policies for `users` (select/update own row).

**Controllers / Services / Repositories**
- Controller thin: read body → call service → shape `{ token, user }`.
- Service owns: email normalization, bcrypt hash/compare, JWT sign (role `customer`), reset-token lifecycle, 409 duplicate email / 401 invalid credentials.
- Repository: `findByEmail`, `createUser`, `findById`, `setResetToken`, `findByResetToken`, `clearResetToken`, `touchLastLogin` — each returning the shared `{ ok, data, reason, code }` envelope.

**Frontend pages** — MODIFY `LoginPage`, `RegisterPage`, `ForgotPasswordPage` (forms already exist; only the data layer changes).

**Components** — MODIFY `auth/LoginForm`, `auth/RegisterForm`, `auth/ForgotPasswordForm`, `auth/ProfileDropdown`, `auth/ProfileCard` only if the context API changes (goal: **zero component changes** by preserving `user/isAuthenticated/login/register/logout/updateProfile`). Keep `SocialLogin` as-is (placeholders).

**Contexts** — MODIFY `frontend/src/context/AuthContext.jsx` to call the API instead of `authStorage`; keep the same public API.

**Hooks** — MODIFY `hooks/useAuth.js` only if needed (it re-exports the context).

**Services** — MODIFY `frontend/src/services/api.js` (attach Bearer token; central 401 → logout handler); MODIFY `frontend/src/services/authStorage.js` (store JWT + user instead of a plaintext registry); MODIFY `services/index.js` barrel.

**Supabase tables** — `users` (read/insert/update own row; reset columns).

**Validation** — server: email format, password ≥ 8, confirm-match, unique email (409). Client: existing `utils/authValidation.js` validators reused; surface server field errors.

**Testing**
- ✓ `cd backend && npm start` boots; admin login still works (regression).
- ✓ `curl` register → login → me → duplicate register (409) → wrong password (401).
- ✓ bcrypt hash visible in `users` row (not plaintext).
- ✓ `cd frontend && npm run build`; manual register → refresh (session persists) → logout.

**Risks.** Breaking existing admin auth during the middleware refactor (mitigate: keep `authorize('admin')`/`verifyAdmin` output identical and regression-test admin login first); email provider dependency for reset (mitigate: dev logs the link, keep a clean seam for a real provider).

**Estimated complexity:** **L**

---

### 5.2 Sprint 21B — Customer Dashboard & Address Book

**Purpose.** Persist the customer profile and address book in Supabase; wire the existing dashboard/profile/addresses/settings pages to the backend. Removes the seeded demo address and demo orders from the dashboard data path.

**Backend routes**
- `GET  /api/customer/profile` · `PUT /api/customer/profile`
- `GET  /api/customer/addresses` · `POST /api/customer/addresses` · `PUT /api/customer/addresses/:id` · `DELETE /api/customer/addresses/:id` (set-default handled in service)

**Files to create (backend)**
- `backend/routes/user.routes.js`, `backend/routes/address.routes.js`
- `backend/controllers/user.controller.js`, `backend/controllers/address.controller.js`
- `backend/services/user.service.js`, `backend/services/address.service.js`
- `backend/repositories/address.repository.js`
- `backend/validators/address.validator.js`

**Files to modify (backend)**
- `backend/repositories/user.repository.js` (extend with update methods)
- `backend/validators/user.validator.js` (profile fields: name/phone)
- Migration 002 additions: RLS policies for `addresses` (user-scoped); `schema.sql` sync.

**Controllers / Services / Repositories** — follow 21A patterns. Service enforces exactly-one-default per user; repository returns `{ ok, data }` envelopes.

**Frontend pages** — MODIFY `AddressesPage` (call API instead of `addressStorage`), `ProfilePage`, `SettingsPage` (only if persistence is desired; notification prefs may stay local for now), `DashboardPage` (read counts/orders from backend; drop demo seed).

**Components** — MODIFY `dashboard/AddressCard`, `dashboard/AddressModal`, `auth/ProfileCard`; `account/StatsCards` now uses real counts.

**Contexts** — MODIFY `AuthContext.updateProfile` → `PUT /api/customer/profile`.

**Hooks** — CREATE `hooks/useAddresses.js` (list/add/update/remove/setDefault). Reuse pattern from `useProducts`.

**Services** — CREATE `frontend/src/services/addresses.js`; MODIFY `services/index.js`. Deprecate `addressStorage.js` usage.

**Supabase tables** — `users` (profile), `addresses` (CRUD, RLS).

**Validation** — name ≥ 2 chars, phone regex, pincode 6-digit (India) — reuse checkout-style validators; enforce server-side too.

**Testing**
- ✓ Build both frontends; manual profile edit persists across refresh.
- ✓ Address add/edit/delete + set-default on the backend and in Supabase.
- ✓ Dashboard shows real stats and empty states for a brand-new user (no seeded demo data).

**Risks.** Empty-state regression (demo seed removal); default-address race on concurrent edits. **Complexity:** **L**

---

### 5.3 Sprint 21C — Cart & Checkout (Order Placement)

**Purpose.** Persist the cart server-side (guest via `session_id` or user via `user_id`) and create **real orders** (order + order_items + stock decrement) at checkout. The 3-step checkout UI is already built — only its data layer changes.

**Backend routes**
- `GET /api/customer/cart` · `POST /api/customer/cart/items` · `PUT /api/customer/cart/items/:id` · `DELETE /api/customer/cart/items/:id` (guest session header `X-Session-Id` or user JWT)
- `POST /api/customer/orders` (create; server recomputes totals, validates stock, decrements, marks cart checked_out)
- `GET /api/customer/orders` · `GET /api/customer/orders/:id`

**Files to create (backend)**
- `backend/routes/cart.routes.js`, `backend/routes/order.routes.js`
- `backend/controllers/cart.controller.js`, `backend/controllers/order.controller.js`
- `backend/services/cart.service.js`, `backend/services/order.service.js` (order-number generator, totals, stock decrement with conditional update to avoid overselling, compensation on failure)
- `backend/repositories/cart.repository.js`, `backend/repositories/order.repository.js`
- `backend/validators/cart.validator.js`, `backend/validators/order.validator.js`

**Controllers / Services / Repositories** — order creation follows the product.service pattern: try insert order → insert order_items → conditional `stock_quantity -= qty` update (verify row count) → cart status `checked_out`; on any failure run compensation deletes. All through `{ ok, data, reason, code }` envelopes.

**Frontend pages** — MODIFY `CheckoutPage`, `OrderSuccessPage` (use server order from navigation state / API, not `loadOrder()`).

**Components** — MODIFY `checkout/OrderReviewModal`, `cart/CartDrawer`, `cart/CartItem` only where totals/sources change. Keep the existing UI.

**Contexts** — MODIFY `CartContext` to sync to the server (create-or-reuse cart, update line quantities), with localStorage as an offline/guest fallback; MODIFY `WishlistContext` untouched here.

**Hooks** — MODIFY `useCheckout` — `placeOrder` calls `POST /api/customer/orders` instead of `saveOrder()`; server returns the order number.

**Services** — CREATE `frontend/src/services/cart.js`, `frontend/src/services/orders.js`; MODIFY `services/index.js`. Deprecate `cartStorage.js`/`orderStorage.js` usage in the checkout path.

**Supabase tables** — `cart`, `cart_items`, `orders`, `order_items` (all exist). Migration 002 additions: RLS policies for these tables; unique constraint on `order_items(cart_id, product_id, size, color)` already present.

**Validation** — server-side recompute of subtotal/discount/shipping/tax/grandTotal; verify product active, price snapshot, `stock_quantity >= qty`; reject empty carts and duplicate submissions (idempotency key optional).

**Testing**
- ✓ Create cart as guest, persist across requests; merge into a user cart on login.
- ✓ Place order: rows in `orders` + `order_items`, stock decremented, cart `checked_out`.
- ✓ Oversell attempt (> stock) rejected with 409.
- ✓ Client build; full checkout happy path from an empty DB.

**Risks.** **Highest-risk milestone** — no native DB transactions in PostgREST; use conditional-update + compensation (same pattern as product.service). Double-submit and money correctness — add idempotency guard. **Complexity:** **XL**

---

### 5.4 Sprint 21D — Order Management (Customer + Admin)

**Purpose.** Real customer order history and real admin order management (list, view, change status). Replaces the mock seeded orders and the placeholder admin Orders page.

**Backend routes**
- Customer: `GET /api/customer/orders` · `GET /api/customer/orders/:id` (already created in 21C — verify/refine)
- Admin: `GET /api/admin/orders` (filters: status, payment_status, date, search) · `GET /api/admin/orders/:id` · `PUT /api/admin/orders/:id/status` · `PUT /api/admin/orders/:id/payment-status`

**Files to create (backend)**
- `backend/routes/adminOrder.routes.js` (or extend `admin.routes.js`)
- `backend/controllers/adminOrder.controller.js`
- `backend/validators/orderStatus.validator.js`

**Files to modify (backend)**
- `backend/routes/order.routes.js`, `backend/services/order.service.js`, `backend/repositories/order.repository.js` — add admin queries (join `users`, items) and status-transition logic.

**Admin frontend**
- CREATE `admin-frontend/src/services/order.service.js`
- CREATE `admin-frontend/src/components/orders/` (OrderTable, OrderRow, OrderFilters, OrderStatusSelect, OrderModal/OrderDetail)
- MODIFY `pages/Orders/OrdersPage.jsx` (placeholder → real list)
- MODIFY `components/dashboard/RecentOrders` + `LowStockList` to use real data (also helps 21G)

**Storefront**
- MODIFY `pages/OrdersPage` → load from `services/orders.js`; remove mock seed orders (`orderStorage.js` seeds).
- MODIFY `components/dashboard/OrderCard`, `OrderModal`, `orders/OrderStatusBadge`, `orders/OrderTimeline` to render real backend shape/statuses.

**Supabase tables** — `orders`, `order_items` (read; admin update status).

**Validation** — allowed status transitions (`pending → confirmed → processing → shipped → delivered`; `→ cancelled`; `refunded`), payment-status set. 400 on invalid transitions.

**Testing**
- ✓ Customer sees only their orders; admin sees all with filters.
- ✓ Status update reflects immediately in both UIs.
- ✓ Builds pass; regression: admin product pages still work.

**Risks.** Low — data-shape drift between the mock order shape and the backend shape (mitigate by keeping the storefront renderer tolerant / normalizing server response to the existing client shape). **Complexity:** **L**

---

### 5.5 Sprint 21E — Wishlist Sync

**Purpose.** Persist wishlist per user; sync the storefront wishlist context to the backend while keeping a guest (localStorage) fallback.

**Backend routes**
- `GET /api/customer/wishlist` · `POST /api/customer/wishlist` (`{ productId }`) · `DELETE /api/customer/wishlist/:productId`

**Files to create (backend)**
- `backend/routes/wishlist.routes.js`
- `backend/controllers/wishlist.controller.js`
- `backend/services/wishlist.service.js`
- `backend/repositories/wishlist.repository.js`
- `backend/validators/wishlist.validator.js`

**Frontend**
- MODIFY `context/WishlistContext.jsx` — load from API when authenticated; optimistic local updates; merge guest list into the user's on login.
- CREATE `frontend/src/services/wishlist.js`; MODIFY `services/index.js`.

**Supabase tables** — `wishlist` (exists; unique `(user_id, product_id)`; RLS policy in migration 002).

**Validation** — product must exist and be active; reject duplicates (409 or idempotent add).

**Testing**
- ✓ Add/remove persists across refresh and devices for the same user.
- ✓ Guest→login merge keeps items.
- ✓ Builds pass.

**Risks.** Merge strategy for guest items (dedupe by product id). **Complexity:** **M**

---

### 5.6 Sprint 21F — Payments (Razorpay)

**Purpose.** Real Razorpay flow: backend creates a Razorpay order, frontend runs the hosted checkout, backend verifies the signature and marks the order paid. Built on top of 21C/21D orders.

**Backend routes**
- `POST /api/payment/razorpay/create-order` (auth) — validate pending order → Razorpay Orders API → store `razorpay_order_id`.
- `POST /api/payment/razorpay/verify` (auth) — verify `razorpay_signature` server-side → set `payment_status = paid`, `payment_method = razorpay`.
- `POST /api/payment/razorpay/webhook` (optional, signed) — idempotent status reconciliation.

**Files to create (backend)**
- `backend/routes/payment.routes.js`
- `backend/controllers/payment.controller.js`
- `backend/services/payment.service.js` (Razorpay SDK wrapper: create order, verify signature, amount checks)

**Files to modify (backend)**
- `backend/config/env.js`/`index.js` — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
- Migration 002 additions: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` on `orders`.

**Frontend**
- CREATE `frontend/src/services/payment.js` (create order, verify).
- MODIFY `hooks/useCheckout.js` — enable the Razorpay method (remove `disabled`), load `checkout.js`, drive the modal, verify on success, then `placeOrder`.
- MODIFY `components/checkout/PaymentSelector` to surface Razorpay state (loading/redirecting).
- MODIFY `OrderSuccessPage` to reflect `paid` status.

**Supabase tables** — `orders` (payment columns).

**Validation** — amount must match server-computed total; signature verification is non-negotiable; webhook idempotency.

**Testing**
- ✓ Razorpay **test mode** end-to-end: card upi, success + failure paths.
- ✓ Order marked `paid` only after signature verification.
- ✓ Tampered payload rejected.
- ✓ Builds pass.

**Risks.** **High (real money).** Requires a live Razorpay account (test keys) — may need the user to supply credentials. Signature/amount verification is mandatory; do not trust the client. **Complexity:** **XL**

---

### 5.7 Sprint 21G — Product Enhancements + Admin Insights

**Purpose.** Close product-data gaps (sizes/colors/gallery/ratings) and make the admin Dashboard, Analytics, and Customers pages real.

**Part 1 — Product enhancements**
- Migration 002 additions: `products.sizes text[]`/`jsonb`, `products.colors jsonb`, wire `image_gallery`; keep `rating`/`rating_count`.
- MODIFY backend: `validators/product.validator.js`, `services/product.service.js` (normalize/map `sizes`, `colors`, `imageGallery`, `rating`), `repositories/product.repository.js` (column select), `controllers/product.controller.js` (pass-through).
- MODIFY admin `components/products/ProductModal.jsx` — actually persist Sizes/Colors (remove "Not persisted" hint).
- MODIFY storefront `pages/ProductPage` — use real product sizes/colors/gallery instead of hardcoded `SIZES`/`COLOR_PALETTE`; replace `getProductRating` fabrication with real `rating`/`rating_count`.

**Part 2 — Admin insights**
- Backend: `GET /api/admin/stats` (revenue, orders, customers, products, low-stock list), `GET /api/admin/customers` (list/search), `GET /api/admin/analytics` (sales-by-period, top products, order status breakdown).
  - CREATE `routes/adminStats.routes.js`, `controllers/adminStats.controller.js`, `services/analytics.service.js`, `repositories/stats.repository.js`.
- Admin frontend: CREATE `services/stats.service.js`, `services/customers.service.js`; MODIFY `pages/Dashboard/DashboardPage` (live StatCards + RealOrders + LowStock), `pages/Analytics/AnalyticsPage` (recharts from API), `pages/Customers/CustomersPage` (list + detail), `pages/Settings/SettingsPage` (store-level config; backend `settings` table optional — can remain UI-only for now).

**Supabase tables** — `products` (new columns), `users` (admin read), `orders`/`order_items` (aggregations).

**Validation** — sizes/colors as validated arrays; analytics queries bounded (date ranges).

**Testing**
- ✓ Product created with sizes/colors/gallery round-trips to Supabase and renders on the storefront.
- ✓ Admin Dashboard shows real numbers that match a seeded order.
- ✓ Builds pass.

**Risks.** Analytics query performance at scale (mitigate with indexes/aggregation and date bounds). **Complexity:** **L–XL**

---

### 5.8 Sprint 21H — UI Polish & Production Hardening

**Purpose.** Make the product production-safe and polished: security, reliability, SEO, and UX consistency. Clears the remaining Critical and Important items.

**Security / reliability (backend)**
- Rate limiting on auth endpoints (e.g., `express-rate-limit`), security headers (`helmet`), request-body size caps, input sanitization.
- RLS policy completion + verification that the anon key is never used for writes.
- Idempotency guard on order creation; retry-safe stock updates.
- Logging/observability (structured logs, request ids).
- Harden `CORS_ORIGINS` in prod; add `FRONTEND_URL` for reset links.

**Functional completion (backend)**
- `GET /api/customer/orders/:id` item snapshots; cancel-order endpoint (with stock restore).
- Newsletter: optional `subscriptions` table + `POST /api/newsletter/subscribe`.
- Coupons: optional `coupons` table + validation endpoint (or keep static for now).

**Storefront polish**
- Consistent empty/loading/error states; a11y pass (focus traps, aria, contrast).
- Remove/guard demo seeds (`orderStorage`, `addressStorage`) behind a dev-only flag.
- SEO/OG meta, sitemap, canonical URLs.
- Order tracking/timeline wiring; recently-viewed persistence (optional).
- Search history / settings remain client-side (acceptable).

**Admin polish**
- Consistent table/status/empty-state components; permission messaging.

**Testing**
- ✓ Full regression: both frontends build; backend boots with `NODE_ENV=production`.
- ✓ Auth endpoints rate-limited; unauthorized access to customer/admin routes rejected.
- ✓ Manual smoke test of every page.
- ✓ `git status` clean after each commit; commits follow the existing conventional style.

**Risks.** Scope creep — cap to the listed items; anything else moves to Sprint 22. **Complexity:** **L**

---

## 6. Architecture Rules (must never violate)

- **DO NOT** duplicate components, services, hooks, contexts, API logic, or utilities — reuse existing ones and extend them.
- **DO NOT** break the existing API surface (`/api/auth/*`, `/api/products/*`, `/api/admin/products`, `/api/upload`, `/api/health`). New customer endpoints live under `/api/customer/*` and `/api/payment/*`.
- **DO NOT** break Cloudinary — image uploads stay server-side; credentials never reach the browser; keep `multer` memory storage and the 5 MB / JPG-PNG-WEBP contract.
- **DO NOT** break JWT — keep `verifyToken` authoritative; the middleware refactor (21A) must keep `authorize('admin')` and `verifyAdmin` behavior identical for existing routes.
- **DO NOT** break existing builds — `frontend`, `admin-frontend`, and `backend` must each still build/start after every milestone.
- **DO NOT** remove legacy behavior the repo depends on (`vercel.json` rewrites, legacy site files served by the backend, legacy in-memory `/cart`).
- **DO NOT** bypass the layered flow: routes → controllers → services → repositories → Supabase. No SQL or Supabase calls outside repositories.
- **DO NOT** touch `db.json`/local files — all persistence stays in Supabase/Cloudinary.
- Keep every mutation through the shared `{ ok, data, reason, code }` repository envelope and route errors through `ApiError` + `asyncHandler`.

## 7. Code Quality Rules

- **Reuse existing code.** E.g., 21A reuses `config`, `auth.service.verifyToken`, `ApiError`, `asyncHandler`; 21C reuses the product.service compensation pattern; 21B reuses checkout-style address validation.
- **Follow current architecture.** New modules mirror the shape of `product.service.js`/`product.repository.js` exactly.
- **Keep components modular.** One feature = one folder (`component/Component.jsx` + `.module.css`); pages compose, never contain business logic.
- **Keep backend layered.** Controllers thin, services own logic, repositories own data access.
- **Keep folder structure clean.** New folders only where a feature is genuinely new (`components/orders/*` in admin, `services/cart.js` etc.).
- **Use existing patterns.** CSS Modules + design tokens; `useSyncExternalStore` for per-item subscriptions; module-level caching for product lists; `useMemo`/`useCallback` conventions.
- **Consolidate duplication found in the audit** where a milestone already touches it (e.g., the two `QuantitySelector` implementations; `CartSummary` vs `OrderSummary`).
- **Never commit secrets.** Keys stay in untracked `.env` files; `.env.example` documents them.
- No tests exist today — introduce a lightweight manual verification script per milestone (and optionally add the first automated tests in 21H).

## 8. Recommendation — Build Sprint 21A (Customer Authentication) FIRST

**Why 21A first:**

1. **Everything depends on it.** Checkout (21C), order history (21D), wishlist (21E), payments (21F), admin Customers/Dashboard (21G) all key off a real customer identity. Without a persisted user, none of them can exist.
2. **Lowest risk, highest leverage.** The backend already has the exact building blocks — JWT signing/verification (`auth.service.js`), bcrypt (installed), Supabase writes, `authorize()` middleware — proven in Sprints 15–20. 21A *extends* existing patterns rather than inventing new infrastructure, and its endpoints are additive (`/api/customer/*`), so nothing existing breaks.
3. **It replaces the largest mock in the system.** `AuthContext` + plaintext localStorage is the single most insecure and misleading part of the codebase; removing it de-risks every later sprint and lets customers genuinely register today.
4. **Incremental value from day one.** After 21A, the already-built dashboard, profile, and checkout pages can run against real accounts, so each later milestone lands on a solid foundation.

**Suggested sprint execution order:** 21A → 21B → 21C → 21D → 21E → 21F → 21G → 21H, with a **clean commit and verification gate at the end of every milestone** (build both frontends + boot backend, run the milestone's manual checks, `git status` clean, conventional commit message).

---

*Awaiting approval — no code has been written.*
