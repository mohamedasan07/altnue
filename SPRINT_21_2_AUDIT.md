# UNSORTED — Sprint 21.2 Audit (Customer Profile & Address Book)

**Status:** Phase 1 — Audit only. No code written.
**Base commit:** `022bcfd` ("feat: complete Sprint 21.1 customer authentication") — working tree clean, branch `main`.
**Scope:** Sprint 21.2 = plan milestone **21B** ("Customer Dashboard & Address Book"). This document audits the current state and produces the implementation strategy. Nothing is implemented until this audit is approved.

---

## 0. Executive summary

Sprint 21.1 shipped the **customer authentication backend only**. The storefront still runs the **plaintext localStorage mock** `AuthContext` (`frontend/src/context/AuthContext.jsx`) — register/login/me/forgot/reset never call the new `/api/customer/auth/*` endpoints.

This is the single most important finding of the audit:

> **Sprint 21.2 cannot persist a single address or profile edit until the storefront auth is wired to the real backend.** The `addresses` table requires a real `users.id` (UUID FK). The mock issues synthetic ids like `usr_...` that would violate the FK. Real profile updates (`PUT /api/customer/profile`) are keyed off `req.user.id` from the customer JWT — no JWT, no identity.

Consequence: the **frontend auth wiring that the 21A plan listed but did not ship must land inside (or immediately before) 21.2.** Everything else in 21.2 follows the existing, proven layered pattern and is low risk.

Everything else about the codebase is clean and consistent: the backend is layered (`routes → controllers → services → repositories → Supabase`), errors flow through `ApiError` + `asyncHandler`, repositories return the `{ ok, data, reason, code }` envelope, and the frontend has complete, polished profile/dashboard/address UI that only needs its data layer swapped.

---

## 1. Current customer profile architecture

### 1.1 Backend (real, Sprint 21.1)

**Layers already present** (all `backend/`):

| Layer | File | Responsibility |
|---|---|---|
| Route | `routes/customerAuth.routes.js` | `POST /register`, `POST /login`, `GET /me` (auth), `POST /forgot-password`, `POST /reset-password`; mounted at `/api/customer/auth` in `routes/index.js` |
| Controller | `controllers/customerAuth.controller.js` | Thin: call service, shape `{ success, token, user }` |
| Service | `services/customerAuth.service.js` | bcrypt, JWT sign (role `customer`, 7d), `normalizeCustomer()`, anti-enumeration 401, hashed single-use reset tokens |
| Repository | `repositories/user.repository.js` | `findUserByEmail`, `insertUser`, `findUserById`, `touchLastLogin`, `setResetToken`, `findUserByResetToken`, `updatePasswordHash` |
| Validator | `validators/user.validator.js` | Register/login/reset payloads; `normalizeEmail` |
| Middleware | `middleware/auth.middleware.js` | `authenticate()` attaches `req.user` for customer tokens; `authorize(...roles)` / `verifyAdmin` unchanged for admin |

**Public profile shape** returned by `normalizeCustomer` (customerAuth.service.js:50):

```
{ id, email, firstName, lastName, phone, avatarUrl, role, isActive }
```

**Gaps for 21.2:**
- No `GET/PUT /api/customer/profile` endpoints.
- `normalizeCustomer` drops `created_at` and `last_login_at` (both are selected in `USER_SAFE_COLUMNS`) — the dashboard "Member since" text will break (see §6.5).
- No profile update method in `user.repository.js`.

### 1.2 Frontend (mock — must be replaced)

`frontend/src/context/AuthContext.jsx` reads/writes a plaintext user registry + session in localStorage via `services/authStorage.js`. Public API: `{ user, isAuthenticated, login, register, logout, updateProfile }`.

- Mock `user` shape: `{ id, firstName, lastName, email, phone, password, address, createdAt }` — note the **`address` string** (a single free-text field) and **`createdAt`**, neither of which exist in the real API profile.
- `LoginForm`/`RegisterForm`/`ForgotPasswordForm` call `login(values)` / `register(values)` — only the data layer changes; **components can stay unchanged** if the context API is preserved.
- `ProfileCard` (`components/auth/ProfileCard.jsx`) edits `firstName/lastName/phone/address` via `updateProfile`; the `address` field is a mock concept that has no backend column.
- `SettingsPanel` (`components/dashboard/SettingsPanel.jsx`) edits identity via the same `updateProfile`.

---

## 2. Current address architecture

### 2.1 Database (`backend/database/schema.sql`, synced in `001_initial_schema.sql`)

```sql
create table public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  name       text not null,
  phone      text not null,
  address    text not null,
  city       text not null,
  state      text not null,
  pincode    text not null,
  country    text not null default 'India',
  is_default boolean not null default false,
  created_at / updated_at timestamptz
);
```
- Index `idx_addresses_user (user_id)` exists.
- RLS **enabled but ZERO policies** → locked for the anon key (fine; backend writes via service-role key which bypasses RLS — defense-in-depth policy is still missing).
- `updated_at` trigger already attached (`trg_addresses_updated_at`).

### 2.2 Backend

**None.** No address repository, service, controller, or route exists.

### 2.3 Frontend (mock)

- `services/addressStorage.js` — localStorage CRUD, **seeds a demo "Ava Kane" address** on first access.
- `pages/AddressesPage.jsx` — full CRUD + set-default over the mock; renders `AddressCard` grid + `AddressModal`.
- `pages/DashboardPage.jsx` — reads `loadAddresses()` purely for the `StatsCards` count.
- `components/dashboard/AddressCard.jsx` — renders name/phone/address/city/state/pincode/country + Default badge + edit/delete/make-default actions. **Reusable as-is.**
- `components/dashboard/AddressModal.jsx` — focus-trapped, accessible add/edit modal with inline validation (`PIN_RE = /^\d{6}$/`, phone regex). **Reusable as-is.**
- `components/checkout/CheckoutForm.jsx` + `hooks/useCheckout.js` — an **independent, more complete** address validation set (name ≥ 2, 10-digit phone, 6-digit India pin, international postcode). **No integration** with the saved-address book.

---

## 3. Existing frontend profile / dashboard / address flow

Routing (`frontend/src/router/AppRouter.jsx`), all behind `<ProtectedRoute>` → `<DashboardLayout>`:

```
/account                 DashboardPage   (welcome, StatsCards, quick actions, recent orders, wishlist preview)
/account/orders          OrdersPage      (orderStorage mock — 21C/21D scope, not 21.2)
/account/wishlist        WishlistPage    (21E scope)
/account/addresses       AddressesPage   (addressStorage mock — 21.2)
/account/profile         ProfilePage → ProfileCard (updateProfile mock — 21.2)
/account/settings        SettingsPage → SettingsPanel (identity + prefs — 21.2)
```

- `DashboardLayout` (sidebar + mobile drawer) and `DashboardSidebar` (nav) are **final and reusable** — no changes needed.
- `ProtectedRoute` gates on `isAuthenticated` (mock today). Once auth is real, this works unchanged.
- `StatsCards` is already prop-driven (`ordersCount`, `wishlistCount`, `addressesCount`) — 21.2 only needs to feed it the real `addressesCount`.

---

## 4. Backend capabilities (inventory)

Complete and verified:
- Layered Express monolith, `server.js` bootstraps CORS allow-list + legacy static files + legacy in-memory `/cart`.
- **Customer auth (21.1):** register / login / me / forgot-password / reset-password; bcrypt (async, 72-byte cap); customer JWT (7d default); uniform 401; hashed single-use reset tokens with 1h TTL.
- **Middleware:** `authorize(...roles)`, `verifyAdmin` alias, `authenticate` (attaches `req.admin` or `req.user`).
- **Infra:** `ApiError`, `asyncHandler`, central `errorHandler`, `logger`, typed `config` + `loadEnv`, cached Supabase singleton (service-role key), Cloudinary upload (multer memory → Cloudinary, 5 MB / JPG-PNG-WEBP), health + boot-time connectivity check.
- **Pattern to copy:** `product.service.js` (slug retry + category rollback compensation, `normalizeProduct`, `toDbError`) and `user.repository.js` (column-safe selects, `{ ok, data, reason, code }` envelope, `code` carries Postgres error codes like `23505`).

Not present (future sprints): cart, orders, order items, wishlist sync, payments, admin stats/customers/analytics.

---

## 5. Supabase `users` and `addresses` tables (current state)

| Table | Columns | RLS | Policies | 21.2 need |
|---|---|---|---|---|
| `users` | id (uuid), email (citext, unique), password_hash, first_name, last_name, phone, avatar_url, role, is_active, last_login_at, reset_token, reset_token_expires_at, created_at, updated_at | enabled | `users_select_own`, `users_update_own` (anon-key defense) | Profile update; **no schema change required** — all profile columns already exist |
| `addresses` | id, user_id (FK cascade), name, phone, address, city, state, pincode, country (default `India`), is_default, created_at, updated_at | enabled | **none** | RLS policies + (recommended) partial unique index on `is_default`; schema otherwise complete |

Both are **fully shaped for 21.2 already** — the schema anticipates profile + address book. The only schema work is a new migration for address RLS policies (+ default-address integrity), mirroring how `002_customer_auth.sql` added user policies.

---

## 6. Risks

### 6.1 CRITICAL — storefront auth is still the localStorage mock
Address persistence needs a real `users.id` (UUID FK) and `req.user.id` (JWT). Without wiring `AuthContext` → `/api/customer/auth/*` first, 21.2 has no identity to attach addresses to.
**Mitigation:** land frontend auth wiring as part of 21.2 (Phase A below). Keep the `AuthContext` public API identical so `LoginForm`/`RegisterForm`/`ProtectedRoute`/`ProfileDropdown` need **zero** component changes.

### 6.2 Profile shape drift breaks dashboard metadata
Real API returns `id/email/firstName/lastName/phone/avatarUrl/role/isActive` but **not** `createdAt`. `DashboardPage.memberSince` reads `user?.createdAt` → "Member since" would render nothing. Also the mock's `user.address` string doesn't exist server-side.
**Mitigation:** return `createdAt` (and `lastLoginAt`) in `normalizeCustomer`; remove the `address` field from `ProfileCard`/`SettingsPanel` (addresses live in the address book now).

### 6.3 Default-address race (exactly-one-default)
Two concurrent set-default requests can leave two rows flagged default.
**Mitigation (recommended, DB-enforced):** partial unique index `create unique index on addresses(user_id) where is_default` + a service that first clears defaults then sets one. This avoids future debt when checkout (21C) auto-selects the default address.

### 6.4 Demo-seed removal regression
Removing `SEED_ADDRESS` (and later `SEED_ORDERS`) changes first-run empty states.
**Mitigation:** keep the existing empty states in `AddressesPage`/`DashboardPage` (they already exist); just stop seeding. Never seed demo rows into the real `addresses` table.

### 6.5 Token storage + 401 handling
The mock stored passwords in localStorage. JWT will replace it.
**Mitigation:** store `unsorted_customer_token` (+ user JSON) in `authStorage.js`; extend `api.js` `request()` to attach `Authorization: Bearer` and centrally handle 401 → logout (mirrors the admin frontend's interceptor pattern in `admin-frontend/src/services/api.js`).

### 6.6 Missing `/reset-password` route (21.1 gap)
The backend mints reset URLs at `/reset-password?token=...` (`customerAuth.service.js:172`) but **no such route exists in `AppRouter.jsx`** — the ForgotPassword page only surfaces the dev URL.
**Mitigation (recommended, small):** add a `ResetPasswordPage` + route while wiring auth. Not strictly 21.2, but it is on the same code path and avoids a broken reset link.

### 6.7 Regression safety
Admin auth, product CRUD, Cloudinary upload, legacy `/cart`, CORS, and both frontend builds must keep working.
**Mitigation:** all new endpoints are additive under `/api/customer/*`; the `auth.middleware` refactor already preserved `authorize('admin')`/`verifyAdmin` behavior (verified in 21.1). Regression test admin login + product CRUD after changes.

---

## 7. Files that must be created

### Backend
| File | Purpose |
|---|---|
| `backend/routes/user.routes.js` | `GET /api/customer/profile` · `PUT /api/customer/profile` (both `authorize('customer')`) |
| `backend/routes/address.routes.js` | `GET /api/customer/addresses` · `POST` · `PUT /:id` · `DELETE /:id` (set-default handled in service) |
| `backend/controllers/user.controller.js` | Thin profile handlers |
| `backend/controllers/address.controller.js` | Thin address handlers |
| `backend/services/user.service.js` | `getProfile`, `updateProfile`; row→API mapping; exactly-one-email immutable |
| `backend/services/address.service.js` | List/add/update/remove/setDefault with exactly-one-default + ownership checks |
| `backend/repositories/address.repository.js` | `findAllByUser`, `insertAddress`, `updateAddressById`, `deleteAddressById`, `clearDefault`, `setDefaultById` — all scoped by `user_id` |
| `backend/validators/address.validator.js` | name ≥ 2, phone regex, address ≥ 8, pincode 6-digit (India) / postcode, country allow-list |
| `backend/database/migrations/003_addresses.sql` | RLS policies on `addresses` (select/insert/update/delete own rows) + partial unique index on `(user_id) where is_default` |

### Frontend
| File | Purpose |
|---|---|
| `frontend/src/services/addresses.js` | API CRUD (`request('/api/customer/addresses', …)`) |
| `frontend/src/services/customerAuth.js` | API `login/register/me/logout` calling `/api/customer/auth/*` (or fold into `authStorage`) |
| `frontend/src/hooks/useAddresses.js` | list/add/update/remove/setDefault hook, modeled on `useProducts.js` (status: loading/ready/error, `reload`) |

---

## 8. Files that must be modified

### Backend
| File | Change |
|---|---|
| `backend/repositories/user.repository.js` | Add `updateUserProfile(id, patch)` (whitelisted columns: first_name, last_name, phone, avatar_url) |
| `backend/validators/user.validator.js` | Add `validateProfilePayload` (name ≥ 2, phone regex; email immutable) |
| `backend/services/customerAuth.service.js` | Extend `normalizeCustomer` to include `createdAt`, `lastLoginAt` |
| `backend/routes/index.js` | Mount `userRoutes` at `/customer/profile`-style path and `addressRoutes` at `/customer/addresses` |
| `backend/database/schema.sql` | Sync with migration 003 (address RLS policies + index) |

### Frontend
| File | Change |
|---|---|
| `frontend/src/context/AuthContext.jsx` | Call real API for login/register/logout/me/updateProfile; **keep public API identical** (`user`, `isAuthenticated`, `login`, `register`, `logout`, `updateProfile`); updateProfile → `PUT /api/customer/profile` |
| `frontend/src/services/api.js` | Attach `Authorization: Bearer` from stored token; central 401 → logout |
| `frontend/src/services/authStorage.js` | Store `{ token, user }` instead of a plaintext registry (keep key name/API drift-free) |
| `frontend/src/services/index.js` | Barrel the new services |
| `frontend/src/pages/AddressesPage.jsx` | Swap `addressStorage` for `useAddresses`; keep UI/empty states |
| `frontend/src/pages/DashboardPage.jsx` | `addressesCount` from `useAddresses` (or the API); remove `loadAddresses` import; keep `loadOrders` untouched (21C/21D scope) |
| `frontend/src/components/auth/ProfileCard.jsx` | Drop the mock `address` string field; render real profile fields |
| `frontend/src/components/dashboard/SettingsPanel.jsx` | Identity edit stays via `updateProfile` (now real); prefs/theme unchanged (localStorage acceptable) |
| `frontend/src/pages/LoginPage.jsx` / `RegisterPage.jsx` / `ForgotPasswordPage.jsx` | Data layer only — likely zero change if context API preserved |

---

## 9. Files that must NOT be touched

- `backend/server.js` (bootstrap, CORS, legacy static + `/cart`) and `vercel.json`, root legacy files (`index.html`, `style.css`, `script.js`, `checkout_patch.js`, `razorpay_checkout.js`).
- Backend admin/product/auth/upload routes, controllers, services, repositories, `middleware/auth.middleware.js` behavior, `config/*`, `database/client.js`, `cloudinary/*`, `middleware/errorHandler.js`, `middleware/notFound.js`, `utils/*`.
- `backend/database/migrations/001_initial_schema.sql` and `002_customer_auth.sql` (apply new migration, never edit old ones).
- All of `admin-frontend/`.
- Storefront `context/CartContext.jsx`, `context/WishlistContext.jsx`, `context/ThemeContext.jsx`, `hooks/useCart.js`, `hooks/useWishlist.js`, `hooks/useCheckout.js`, all cart/checkout/wishlist components, `pages/CheckoutPage.jsx`, `pages/OrderSuccessPage.jsx`, `pages/OrdersPage.jsx`, `services/cartStorage.js`, `services/orderStorage.js` (21C/21D/21E scope).
- `frontend/src/components/dashboard/AddressCard.jsx`, `AddressModal.jsx` (reused as-is), `DashboardLayout`, `DashboardSidebar`, `StatsCards`, `ProtectedRoute`.

---

## 10. Reusable services / components

**Backend (reuse directly):**
- `ApiError`, `asyncHandler`, `errorHandler`, `logger` — throw/route errors exactly like `product.service.js`.
- `authorize('customer')` — mount on all new customer routes.
- `getSupabase()` client + `{ ok, data, reason, code }` envelope — copy `user.repository.js` conventions.
- Compensation/conditional-update pattern from `product.service.js` (applicable to set-default + later order stock in 21C).

**Frontend (reuse directly):**
- `AddressCard`, `AddressModal` (validation + a11y already built) — wire them to `useAddresses`.
- `AuthField`, `Button`, `Container`, `Loader`, `motion`, `cn`, `formatINR` (all used by the pages being modified).
- `useProducts.js` hook pattern (module cache + `loading/ready/error`) → template for `useAddresses.js`.
- `request()` in `api.js` → extend, don't fork.

**Consolidation opportunity (avoid future debt):**
- Address validation currently exists in **two places** with different rules: `AddressModal.jsx` (inline) and `useCheckout.js` (`PIN_RE`, `PHONE_RE`, `validators`). Extract a single `frontend/src/utils/addressValidation.js` used by **both** `AddressModal` and `CheckoutForm` — and later by checkout prefill (21C) — so shipping-address rules never drift. Server-side, the new `address.validator.js` becomes the single source for order `shipping_address` validation in 21C.

---

## 11. Recommended architectural improvements (before implementation)

These avoid technical debt for orders, checkout, and payments (21C–21F):

1. **DB-enforced exactly-one-default** — partial unique index on `addresses(user_id) where is_default`. Kills the race condition permanently; checkout (21C) can then safely auto-select the default.
2. **Address book = single source of shipping data.** The `addresses` columns already mirror the checkout shipping shape and the `orders.shipping_address` jsonb snapshot. Reuse the same service-level address shape so 21C can prefill the checkout form from the default address and stamp `shipping_address` from the same normalized object.
3. **Return `createdAt`/`lastLoginAt` in the customer profile** so dashboard metadata and future admin Customers page (21G) have real data without a second query.
4. **Centralize 401 handling in `request()`** (attach Bearer + on 401 → logout). Every future customer API consumer (cart 21C, orders 21D, wishlist 21E, payments 21F) then inherits it for free — mirroring the admin frontend's Axios interceptor.
5. **Keep email immutable** in profile updates; future payment/settings pages reuse the single `AuthContext.updateProfile` seam rather than adding new mutation paths.
6. **Small 21.1 completion while wiring auth:** add the missing `/reset-password` route so the shipped forgot-password flow is actually usable.

---

## 12. Detailed implementation strategy (for approval)

Ordered so the repo is buildable and committed at every stage. Layered flow is preserved everywhere: `routes → controllers → services → repositories → Supabase`; every mutation through the `{ ok, data, reason, code }` envelope; errors through `ApiError` + `asyncHandler`.

**Phase A — Backend profile + addresses (additive, zero breakage).**
1. `migrations/003_addresses.sql`: RLS policies on `addresses` (own-row select/insert/update/delete) + partial unique index on default; sync `schema.sql`.
2. `user.repository.js`: add `updateUserProfile`. `user.validator.js`: add `validateProfilePayload`. `customerAuth.service.js`: extend `normalizeCustomer` (+`createdAt`, `lastLoginAt`).
3. Create `address.repository.js`, `address.validator.js`, `address.service.js`, `address.controller.js`, `address.routes.js`, `user.service.js`, `user.controller.js`, `user.routes.js`.
4. Mount in `routes/index.js`. New endpoints:
   - `GET /api/customer/profile` · `PUT /api/customer/profile`
   - `GET /api/customer/addresses` · `POST /api/customer/addresses` · `PUT /api/customer/addresses/:id` · `DELETE /api/customer/addresses/:id`
   - All `authorize('customer')`. 404 on another user's address id; 400 on invalid payload; 409-friendly envelope handling.
5. Verify: `cd backend && npm start` boots; admin login + product CRUD regression; curl the new endpoints with a customer JWT (register → login → me → profile update → address CRUD → set-default).

**Phase B — Frontend auth wiring (prerequisite for 21.2 data).**
1. `api.js`: attach Bearer from stored token; central 401 → logout.
2. `authStorage.js`: persist `{ token, user }`.
3. `AuthContext.jsx`: `login`/`register`/`logout`/`me`/`updateProfile` call the real API; preserve the public API surface → `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ProtectedRoute`, `ProfileDropdown` remain **unchanged**.
4. (Recommended) add `/reset-password` route + page.
5. Verify: manual register → refresh (session restored via `/me`) → logout; 401 clears session.

**Phase C — Frontend addresses.**
1. Create `services/addresses.js` + `hooks/useAddresses.js` (list/add/update/remove/setDefault; `loading/ready/error`; owns optimistic default clearing).
2. Rewire `AddressesPage.jsx` (keep `AddressCard`/`AddressModal` and empty states).
3. `DashboardPage.jsx`: feed `addressesCount` from `useAddresses`.
4. (Recommended) extract shared `utils/addressValidation.js` used by `AddressModal` + `CheckoutForm`.

**Phase D — Frontend profile.**
1. `ProfileCard.jsx`: drop the mock `address` field; render `firstName/lastName/phone` (+email read-only); save via `updateProfile` (real `PUT`).
2. `SettingsPanel.jsx`: identity card unchanged in behavior (now real); notification/privacy/theme stay local.
3. `DashboardPage` "Member since" uses real `createdAt`.

**Phase E — Verification gate.**
- `cd frontend && npm run build` · `cd admin-frontend && npm run build` · backend boots in `NODE_ENV=production`.
- Manual: register → edit profile (persists across refresh) → add/edit/delete/set-default address → brand-new user sees **no demo seed** → admin login + product CRUD still work.
- `git status` clean; conventional commit per repo style.

**Estimated complexity:** L (backend L, frontend M–L, auth wiring M).

---

*Awaiting approval — no code has been written.*