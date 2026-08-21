# Sprint 22.6 — Production Security Hardening

## DISCOVERY VALIDATION REPORT (read-only)

- **Base commit:** `f284abd` (feat: complete Sprint 22.5 customer order self-service)
- **Purpose:** Validate the 24 findings from the Freebuff/Mimo 2.5 QA report against the actual code and production architecture. **No fixes were applied.**
- **Method:** Static audit of all three apps; `git ls-files` for tracked/deployed artifacts; env/config inspection (secret values never printed); deployment-topology inference from `vercel.json` + Render references; grep across source and lockfiles.
- **Validation limit:** Anything dependent on live production state — Render env vars (`CORS_ORIGINS`, `ADMIN_PASSWORD_HASH`, `NODE_ENV`, `JWT_EXPIRES_IN_CUSTOMER`), Vercel project wiring, live DB rows — **cannot be confirmed from a local checkout**. Those findings are flagged `NEEDS PRODUCTION CONFIRMATION`.

Legend: **Present** = exists in code · **Reachable** = exposed in current architecture · **Active** = used by React storefront/admin · **Prod impact** = severity left as-is · **Reproducible** = demonstrable without prod access · **Breaking** = fix requires architectural change · **22.5 dep** = Sprint 22.5 depends on it.

## 1. Finding-by-finding validation

### CRITICAL

| ID | Verdict | Present | Reachable | Active | Prod impact | Reproducible | Breaking | 22.5 dep |
|----|---------|---------|-----------|--------|-------------|--------------|----------|----------|
| C1 | CONFIRMED — legacy-only | Yes | Yes (`/`) | No | Low (stale-catalog page, unused by modern app) | Yes | No (removal) | None |
| C2 | CONFIRMED — legacy-only | Yes | Yes | No | Low (unauthenticated global state) | Yes | No (removal) | None |
| C3 | CONFIRMED — production | Yes | Yes | Yes | High (brute-force / credential stuffing) | Yes | No (additive) | None |
| C4 | CONFIRMED (code); prod env unverifiable | Yes | Yes | Yes | High **if** prod lacks `ADMIN_PASSWORD_HASH` | Partial (local) | No (config) | None |

### HIGH

| ID | Verdict | Present | Reachable | Active | Prod impact | Reproducible | Breaking | 22.5 dep |
|----|---------|---------|-----------|--------|-------------|--------------|----------|----------|
| H1 | CONFIRMED | Yes | Yes | Yes | Medium–High (XSS → token theft) | Yes | **Yes** (cookie migration) | Yes (auth underpins orders) |
| H2 | CONFIRMED | Yes | Yes | Yes | Medium (long-lived bearer, no revocation) | Yes | No (lifetime policy) | Yes |
| H3 | CONFIRMED | Yes | Yes | All responses | High (missing CSP/HSTS/XCTO/X-Frame) | Yes | No (additive) — CSP conflicts with legacy inline scripts | None |
| H4 | CONFIRMED | Yes | Yes | Yes | High only combined with C3 | Yes | No (additive) | None |
| H5 | CONFIRMED (code); prod value unverifiable | Yes | Yes | Yes | **High if empty on Render** (storefront fails) | Partial (local repro) | No (config) | **Yes** |
| H6 | CONFIRMED | Yes | Yes | Yes | Low–Medium (no override, single-host coupling) | Yes | No (env refactor) | None |

### MEDIUM

| ID | Verdict | Present | Reachable | Active | Prod impact | Reproducible | Breaking | 22.5 dep |
|----|---------|---------|-----------|--------|-------------|--------------|----------|----------|
| M1 | CONFIRMED — legacy-only | Yes | Yes | No | Low (duplicate stale site) | Yes | No (removal) | None |
| M2 | CONFIRMED | Yes | — | Separate apps | None (consistency) | Yes | No | None |
| M3 | CONFIRMED | Yes | — | Yes | None (performance) | Yes (build) | No | None |
| M4 | CONFIRMED | Yes | — | Yes | None (resilience) | Yes | No | None |
| M5 | CONFIRMED | Yes | — | — | Risk-reduction gap, not a vuln | Yes | No | None |
| M6 | CONFIRMED | Yes | — | Yes | None (functional gap) | Yes | No | None |
| M7 | **FALSE POSITIVE (mostly)** | No | — | Yes (works) | None | N/A | N/A | None |
| M8 | CONFIRMED — placeholder/dead | Yes | Legacy only | No | None (no payments processed) | Yes | No | None |

### LOW

| ID | Verdict | Present | Reachable | Active | Prod impact | Reproducible | Breaking | 22.5 dep |
|----|---------|---------|-----------|--------|-------------|--------------|----------|----------|
| L1 | CONFIRMED | Yes | — | — | Hygiene | Yes | No | None |
| L2 | CONFIRMED | Yes | — | — | Hygiene | Yes | No | None |
| L3 | CONFIRMED (weak) | Yes | Yes | No | Trivial (404 favicon on legacy page) | Yes | No | None |
| L4 | CONFIRMED — legacy-only | Yes | Yes | No | XSS surface only on legacy page | Yes | No | None |
| L5 | CONFIRMED — legacy-only | Yes | Yes | No | A11y gap only on legacy modal | Yes | No | None |
| L6 | CONFIRMED | Yes (in `.env`) | — | Never read | None (dead config) | Yes | No | None |

## 2. Confirmed findings (evidence)

- **C1 — legacy hardcoded prices** — `index.html:138-508`: every "Add to Cart" button hardcodes `data-price` (₹999–₹3,999) + `data-image`. Internally inconsistent too: id 17 "Retro Sunglasses" → `accessory2_belt.jpg`, id 18 → `accessory3_bag.jpg`, id 19 → `accessory4_hat.jpg`; ids 21–23 use Unsplash, rest Cloudinary. Static snapshot can drift from the live Supabase catalog. Served at `/` and `/index.html` (`backend/server.js:115-118`).
- **C2 — legacy in-memory `/cart*`** — `backend/server.js:123-181`: module-level `let cart = []`, `GET/POST /cart`, `PUT/DELETE /cart/:id`. No auth, no per-user scoping, no qty cap, lost on restart. Only consumers are legacy `script.js` (`fetch('${API_BASE}/cart')`) and `checkout_patch.js`. Superseded by `/api/customer/cart` (Sprint 21.3).
- **C3 — no rate limiting** — no `express-rate-limit`/rate-limiter in `backend/package.json` or lockfile; no throttle logic in any controller. Public `POST /api/auth/login`, `/api/customer/auth/{register,login,forgot-password,reset-password}` all unbounded.
- **C4 — plaintext admin fallback** — `backend/config/env.js:41-42` (`ADMIN_PASSWORD` default `admin123`), `backend/services/auth.service.js:57-64` (bcrypt when `ADMIN_PASSWORD_HASH` set, else plaintext equality), `backend/config/index.js:55-57`. Local `backend/.env` (gitignored) defines `ADMIN_PASSWORD` and **no** `ADMIN_PASSWORD_HASH` (value not printed). Render env unverifiable locally → `NEEDS PRODUCTION CONFIRMATION`.
- **H1 — JWT in localStorage** — customer: `frontend/src/services/authStorage.js:6-7` (`unsorted_customer_token`); admin: `admin-frontend/src/utils/storage.js:6-9` (`admin_token`). Both stateless Bearer JWTs attached by `frontend/src/services/api.js:25-36` and `admin-frontend/src/services/api.js:37-54`. Mitigants: React renders text by default (no `dangerouslySetInnerHTML` in modern apps); no third-party runtime scripts in React bundles.
- **H2 — customer JWT 7d** — `backend/config/env.js:51` (`JWT_EXPIRES_IN_CUSTOMER` default `'7d'`), `backend/services/customerAuth.service.js:66-77`. Admin stays `1d`. No refresh-token mechanism → shorter expiry means forced re-login.
- **H3 — no security headers** — `backend/server.js:27-84`: only `app.disable('x-powered-by')`. No `helmet`; no CSP/HSTS/X-Frame-Options/X-Content-Type-Options. Conflict: legacy `index.html:520-526` uses inline scripts (`window.RAZORPAY_KEY_ID`) + external FontAwesome/Google Fonts, so a strict CSP requires legacy removal first.
- **H4 — no account lockout** — no attempt tracking in `auth.service.js`/`customerAuth.service.js`, no counter column in schema (`backend/database/migrations/001-004`). Compounded by C3.
- **H5 — production CORS** — `backend/server.js:35-84`: production (Render sets `NODE_ENV=production`) requires `CORS_ORIGINS`; otherwise browser blocks. **Nuance:** the deployed React storefront calls `https://unsorted-backend.onrender.com` **directly** (cross-origin → needs CORS) per H6, while root `vercel.json` rewrite (`/api/(.*)` → Render) is same-origin (no CORS) and targets the legacy root deploy. Local `backend/.env` has **no** `CORS_ORIGINS`. An empty allow-list on Render would silently break storefront auth/cart/orders — verify before any CORS change. `NEEDS PRODUCTION CONFIRMATION`.
- **H6 — hardcoded backend URL** — `frontend/src/services/api.js:8` `REMOTE_BASE = 'https://unsorted-backend.onrender.com'`; duplicated in `vercel.json:5`. Admin does it correctly via `VITE_API_URL` (`admin-frontend/src/services/api.js:31`). Works today; no env override; dev/prod inconsistency.
- **M1 — legacy site still served** — `backend/server.js:101-118` serves 5 files (`index.html`, `style.css`, `script.js`, `checkout_patch.js`, `razorpay_checkout.js`) at root. Root `vercel.json` implies the **root is also a deployed Vercel project** (legacy page may be the public root URL; architecture docs reference allow-list example `https://unsorted-swart.vercel.app`). Deploy topology needs prod confirmation before removal.
- **M2 — React version skew** — `frontend/package.json:14-15` (18.3.1) vs `admin-frontend/package.json:14-15` (19.2.8). Separate apps, no shared runtime.
- **M3 — admin bundle** — `admin-frontend/dist` ≈ 807 KB / 4 files (recharts + react-icons + axios), no route-level code-splitting; `frontend/dist` ≈ 697 KB / 48 files. Performance only.
- **M4 — no customer ErrorBoundary** — `frontend/src/main.jsx` renders `<App/>` with no boundary; grep for `ErrorBoundary|componentDidCatch|getDerivedStateFromError` → none. Render crash blank-screens the SPA.
- **M5 — no backend tests** — no source `*.test.js`/`*.spec.js`, no `test` script in `backend/package.json`.
- **M6 — newsletter no-op** — `frontend/src/components/home/Newsletter.jsx:10-13`: `handleSubmit` only flips `submitted` state. No API, no storage, no endpoint.
- **M7 — React search — FALSE POSITIVE (mostly)** — Modern search is complete end-to-end: live overlay `components/search/SearchOverlay/SearchOverlay.jsx` (debounced `useSearch` over full catalog, recent searches, keyboard nav via `aria-activedescendant`, focus trap); entry point `components/Navbar/SearchButton.jsx` rendered at `Navbar.jsx:73`; "View all" → `/collections?q=term` consumed by `hooks/useFilters.js:164-171`. Only gap: no server-side search endpoint — unnecessary for a catalog this size. Not a security finding.
- **M8 — Razorpay placeholder** — `frontend/src/hooks/useCheckout.js:38` (`razorpay` disabled "Coming soon"); backend rejects `razorpay` (`backend/validators/order.validator.js:37,203-211`); orders recorded `payment_status='pending'` (`backend/services/order.service.js:381-396`). No SDK/order/signature/webhook in modern stack. `razorpay_checkout.js`/`checkout_patch.js` load only via legacy `index.html:519,524` with placeholder key `rzp_test_MYKEY`. Dead/placeholder; no payments processed.
- **L1 — no frontend ESLint** — `frontend/` has no eslint config/script; `admin-frontend/` has `eslint.config.js` + `lint` script (`admin-frontend/package.json:9`).
- **L2 — no TS/JSDoc checking** — no `tsconfig.json` anywhere; plain JS/JSX; no `@ts-check`.
- **L3 — legacy favicon** — legacy `index.html:1-11` `<head>` has **no** favicon → 404 `/favicon.ico`. React frontend uses inline SVG data-URI favicon (`frontend/index.html:8-11`); admin ships `public/favicon.svg`. Trivial; dies with M1.
- **L4 — legacy `innerHTML`** — `script.js:227,237,248,518,524,549,558`: grids/cart/modal rendered via string-interpolated `innerHTML` (XSS surface, legacy only). React storefront has none.
- **L5 — legacy search a11y** — legacy `index.html:74-77` search modal is a bare `div` + input, no role/label/aria. React search is fully a11y (`role=dialog`, focus trap, listbox).
- **L6 — unused `SESSION_SECRET`** — present in `backend/.env` but `backend/config/env.js` never reads it (grep → no match). Dead config.

## 3. Confirmed findings vs. false positives / legacy-only

**Confirmed, production-relevant (fix in 22.6):** C3, C4, H3, H5.
**Confirmed, production-relevant (review only, no migration):** H1, H2.
**Confirmed, low/infra:** H6, L1, L2, L6.
**Confirmed, legacy-only (removal candidates, not security fixes):** C1, C2, M1, L3, L4, L5.
**Confirmed, non-security / out of scope:** M2, M3, M4, M5, M6, M8.
**False positives:** M7 (modern search works end-to-end).

## 4. Production-impacting findings

1. **C3 — no auth rate limiting** — live public endpoints; brute-force both admin and customer login.
2. **C4 — plaintext admin password fallback** — *if* Render has no `ADMIN_PASSWORD_HASH`, admin auth relies on a plaintext env value (default `admin123`).
3. **H3 — no Helmet/security headers** — every backend response lacks CSP/HSTS/XCTO/X-Frame.
4. **H5 — CORS allow-list** — a misconfigured/empty `CORS_ORIGINS` on Render breaks the storefront (opposite of over-permissive).
5. **H1/H2 — token architecture** — long-lived bearer tokens in localStorage; no revocation; 7d customer lifetime.

## 5. Security severity

| Severity | Findings |
|----------|----------|
| High | C3, C4 (if prod plaintext), H3, H5 (if prod misconfigured) |
| Medium–High | H1 |
| Medium | H2, H4 (with C3) |
| Low–Medium | H6, C1, C2, M1, L4 |
| Trivial/Non-security | M2–M8, L1–L3, L5, L6 |

## 6. Recommended priority

- **P1 (fix in 22.6):** C3 rate limiting, C4 admin password hardening, H3 security headers, H5 CORS verification/hardening. Optionally bundle H4 (account lockout) with C3.
- **P2 (conditional):** Legacy removal — C1, C2, M1, L4, L5 (+L3) — **only after** production confirmation that the deployed storefront is the React app and the root Vercel project no longer needs the legacy page.
- **P3 (review/decide):** H1/H2 token architecture review; H6 env-driven backend URL; L6 dead `SESSION_SECRET` cleanup.
- **Excluded from 22.6:** M2–M8, L1, L2 (see §10).

## 7. Dependencies

- H3 (strict CSP) **depends on** legacy removal (M1/C1/C2) or an exempted/CSP-less legacy route.
- C3 rate limiting must be added **above** auth routes; a misconfigured limiter would lock out real admins/customers — needs test/verification.
- H4 lockout benefits from C3 (defense in depth); needs a small schema column **or** in-memory counter (single Render instance → acceptable).
- H5 verification is a prerequisite for C4's "set `ADMIN_PASSWORD_HASH`" and for H6 — all three touch how prod is configured.
- C1/C2/M1 removal is coupled: they share the same 5 served files and the same `server.js` block (lines 101-181).
- Sprint 22.5 (order self-service) depends on **customer auth + orders + CORS** — not on legacy code, rate limiting, headers, or admin password. None of P1 breaks 22.5 as long as CORS and auth stay intact.

## 8. Risk of fixing

| Finding | Fix risk |
|---------|----------|
| C3 | Low — additive middleware; only risk is over-aggressive limits on shared IPs (mobile networks). Use IP + sane limits, exclude health checks. |
| C4 | Low — code already supports bcrypt; change is env config (`ADMIN_PASSWORD_HASH`). Risk: locking the admin out if hash is wrong → keep `ADMIN_PASSWORD` only until hash verified. |
| H3 | Low–Medium — `helmet()` is additive, but a strict CSP **will break the legacy page** and possibly Cloudinary images/Google Fonts until tuned. Apply per-route or after legacy removal. |
| H5 | Medium — a wrong `CORS_ORIGINS` silently breaks the live storefront. Verify current value first; change one origin at a time. |
| H1 (cookie migration) | **High** — cross-site API (Render backend / Vercel frontend) means `SameSite=Lax` cookies are not sent on XHR; would need `SameSite=None; Secure` + CSRF (double-submit) + cookie middleware + logout flow + re-auth on rollout. This is a breaking auth change → **not in 22.6** unless the feasibility study proves it safe. |
| H2 | Low — env change; UX cost (forced re-login); no refresh mechanism. |
| H6 | Low — env-driven refactor; keep REMOTE_BASE as fallback. |
| C1/C2/M1 | Low–Medium — removal is additive-safe at the code level but **deploy-topology dependent**: if the root Vercel project still serves the legacy site, deletion 404s the root URL. Confirm first, remove in one commit, keep `git` history. |

## 9. Proposed Sprint 22.6 scope

**P1 — shipped:**
1. Rate limiting middleware (C3) applied to `/api/auth/login`, `/api/customer/auth/*` (optionally all `/api`), with health-check exemption and documented limits.
2. Admin password hardening (C4): require/verify `ADMIN_PASSWORD_HASH` in production, hard-fail (or refuse plaintext fallback) when `NODE_ENV=production` and no hash is set. No secret values printed or committed.
3. Security headers via `helmet` (H3): enable defaults + HSTS; CSP scoped to Cloudinary/Google Fonts/Vercel origins; legacy route exempted or CSP applied after removal.
4. CORS verification (H5): document current Render `CORS_ORIGINS`; keep allow-list explicit; add a production smoke test. **Config-only change; value set in Render, not committed.**
5. (Recommended bundle) Account lockout/throttle (H4) behind the same limiter.

**P2 — conditional:** legacy removal (C1/C2/M1/L4/L5/L3) with L6 cleanup, **only after** prod confirmation in §13.

**P3 — decision:** H1/H2 token architecture review (feasibility study only, no migration) + H6 env-driven base URL + remove `SESSION_SECRET` from `.env`.

## 10. Explicitly excluded findings

- **H1 HttpOnly-cookie migration** — excluded unless validation proves it safe; cross-site API makes it breaking (see §8).
- **M2** React version alignment — separate apps, no shared runtime; product decision, not security.
- **M3** admin bundle size / code-splitting — performance sprint.
- **M4** ErrorBoundary — resilience, not security; small, could fold into a later sprint.
- **M5** backend automated tests — **not a fix**, but add smoke tests for new rate-limit/helmet middleware as part of P1 verification.
- **M6** newsletter — needs a marketing/mailer decision.
- **M7** search — false positive.
- **M8** Razorpay — dead/placeholder by design; payments are a future sprint (see `unsorted-payments` skill). No security risk: no payments processed; orders recorded `pending`.
- **L1/L2** ESLint/TS/JSDoc — tooling sprint.
- **L3/L4/L5** — resolved by legacy removal (P2), not individually.

## 11. Files likely to change (if scope is approved)

- `backend/server.js` — helmet mount, rate-limit mount, legacy file/cart removal (P2).
- `backend/package.json` — add `helmet`, `express-rate-limit`.
- `backend/middleware/` — new `rateLimit.middleware.js` (+ optional lockout module).
- `backend/config/env.js` — no weakening of `CORS_ORIGINS`/`ADMIN_PASSWORD_HASH`; add production requirement for hash (C4), keep single env-read point.
- `backend/config/index.js` — surface any new auth/env flags.
- `backend/services/auth.service.js` — C4 production-path enforcement (no plaintext fallback when production + no hash).
- `backend/.env.example` — document `ADMIN_PASSWORD_HASH`, `CORS_ORIGINS`, remove `SESSION_SECRET` (`.env` itself is gitignored — never committed).
- `frontend/src/services/api.js` — H6 env-driven `API_BASE` (P3).
- Root: delete `index.html`, `style.css`, `script.js`, `checkout_patch.js`, `razorpay_checkout.js` (P2, conditional).
- `vercel.json` — possibly update/remove root rewrite **only** after deploy-topology confirmation.

## 12. Files that must be protected

- `backend/config/env.js` — single env read point; never add default secrets; keep CORS logic intact.
- `backend/middleware/auth.middleware.js`, `backend/services/auth.service.js`, `backend/services/customerAuth.service.js` — auth core; rate limiting/lockout must not break login/register/me.
- `backend/services/order.service.js`, `backend/repositories/order.repository.js`, `cart.*`, `backend/validators/order.validator.js` — Sprint 22.5 depends on them; untouched by P1.
- `frontend/src/services/authStorage.js` + `admin-frontend/src/utils/storage.js` — token lifecycle; only change in a deliberate, tested auth migration.
- `vercel.json` + `server.js` CORS block — deployment-critical.
- `backend/.env` / `admin-frontend/.env` — secrets/env; never printed or committed.
- `backend/database/` — no schema changes in 22.6 except (optionally) a lockout counter column; nothing else.

## 13. Verification strategy

1. **Code-level (local, no prod):** static re-audit after each fix; `npm run lint` (admin) and `npm run build` for both frontends; boot the backend and:
   - `curl -i` any route → assert Helmet headers present.
   - Fire N rapid `/api/auth/login` attempts → assert 429 and no token issued.
   - `NODE_ENV=production` + empty `CORS_ORIGINS` → assert browser-origin requests are blocked; then with allow-list → assert allowed (reproduces H5 behavior).
2. **Production confirmation (required before P2 removal and H5 change):**
   - Read Render env vars: `CORS_ORIGINS`, `ADMIN_PASSWORD_HASH`/`ADMIN_PASSWORD`, `NODE_ENV`, `JWT_EXPIRES_IN_CUSTOMER` (via dashboard — do not print secrets into docs).
   - Determine which Vercel project serves the customer storefront and whether the root project still serves the legacy page; confirm the storefront origin is in `CORS_ORIGINS`.
   - Optional read-only DB check: any orders with `payment_method='razorpay'`? (confirms M8 dead) and any traffic to `/cart` in Render logs (confirms C2/M1 unused).
3. **Regression:** full storefront flow (login → cart → checkout → order + cancel) against the running backend before and after P1; admin login + dashboard.
4. **Rollback plan:** P1 changes are config/middleware-additive; keep the pre-change commit hash; CORS changes are env-level (instant revert in Render dashboard).

**STOP — validation only. No code, database, package, or `.env` changes were made.**