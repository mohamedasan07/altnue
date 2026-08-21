# Sprint 22.6 — Phase 1 Security Audit

**Status:** COMPLETE (implementation + verification)
**Base commit:** `f284abd` (feat: complete Sprint 22.5 customer order self-service)
**Scope:** P1 findings C3, C4, H3, H5 from `SPRINT_22_6_SECURITY_VALIDATION.md` only.
**Not started (by design):** Analytics, Settings (Sprint 22.7); Phase 2/P2 legacy cleanup; P3 items.
**Git:** nothing committed or pushed; working tree holds the Phase 1 changes only.

---

## 1. Findings addressed

| Finding | Fix | Status |
|---|---|---|
| **C3** — no auth rate limiting | Per-IP limiters on the four public auth endpoints (`express-rate-limit` v8.6.2) | PASS |
| **C4** — plaintext admin password fallback | Plaintext comparison removed; bcrypt `ADMIN_PASSWORD_HASH` now required; missing hash fails closed (HTTP 500) | PASS |
| **H3** — no Helmet/security headers | `helmet` v8.3.0 with tuned CSP on every response | PASS |
| **H5** — production CORS needs verification | Code-level behavior verified fail-closed; boot warning added for empty production allow-list; actual Render env value **cannot be inspected locally** → deployment requirement | PASS (code) / DEPLOYMENT-REQUIRED (env) |

Additional correctness fixes discovered during verification (documented in §7): six route handlers were unwrapped async functions whose rejection crashed the whole process — all wrapped in `asyncHandler`.

## 2. Exact files changed

Modified:
- `backend/server.js` — Helmet mount + CSP; `app.set('trust proxy', 1)`; hoisted `isProduction`; boot warning when production has empty `CORS_ORIGINS`
- `backend/config/env.js` — `ADMIN_PASSWORD_HASH` documented REQUIRED; new `RATE_LIMIT_ADMIN_LOGIN`, `RATE_LIMIT_CUSTOMER_LOGIN`, `RATE_LIMIT_REGISTER`, `RATE_LIMIT_FORGOT_PASSWORD`
- `backend/config/index.js` — `config.rateLimit` block; `admin.password` marked documentation-only
- `backend/services/auth.service.js` — removed plaintext fallback; `verifyPassword()` throws 500 when hash absent
- `backend/routes/auth.routes.js` — limiter on login; `asyncHandler(me)`
- `backend/routes/customerAuth.routes.js` — three limiters; `asyncHandler(me)`
- `backend/routes/address.routes.js` — `asyncHandler(listAddressesHandler)` (crash-safety)
- `backend/routes/order.routes.js` — `asyncHandler(listOrdersHandler)` (crash-safety)
- `backend/routes/user.routes.js` — `asyncHandler(getProfileHandler)` (crash-safety)
- `backend/routes/wishlist.routes.js` — `asyncHandler(listWishlistHandler)` (crash-safety)
- `backend/.env.example` — documents required hash + rate-limit vars (no real values)
- `backend/package.json` / `backend/package-lock.json` — added `express-rate-limit@^8.6.2`, `helmet@^8.3.0`

New:
- `backend/middleware/rateLimit.middleware.js` — four exported limiters built on shared helper

## 3. Exact rate limits

| Endpoint | Limit | Window | Env override |
|---|---|---|---|
| `POST /api/auth/login` | 10 req/IP | 15 min | `RATE_LIMIT_ADMIN_LOGIN` |
| `POST /api/customer/auth/login` | 20 req/IP | 15 min | `RATE_LIMIT_CUSTOMER_LOGIN` |
| `POST /api/customer/auth/register` | 10 req/IP | 60 min | `RATE_LIMIT_REGISTER` |
| `POST /api/customer/auth/forgot-password` | 5 req/IP | 60 min | `RATE_LIMIT_FORGOT_PASSWORD` |

- Windows are fixed constants; only caps are configurable.
- Over-limit response: HTTP 429 `{"error":"Too many attempts. Please try again later."}` with draft-8 `RateLimit` / `RateLimit-Policy` headers and `Retry-After`.
- Not limited: `/me`, `/reset-password`, and every non-auth endpoint (no impact on normal authenticated traffic).
- Keying: per-IP via default keyGenerator; requires `trust proxy` = 1 behind Render (see §11).

**Measured (live bursts):** admin login `401×10 → 429`; customer login `401×20 → 429`; register (invalid payloads, no DB writes) `400×10 → 429`; forgot-password (nonexistent emails, no DB writes) `200×5 → 429`. A distinct `X-Forwarded-For` client received a fresh bucket (per-client keying works; no 500s). `/api/products`, `/api/health`, guest cart remained 200 during bursts.

## 4. Admin password hardening behavior

- `verifyPassword()` (`backend/services/auth.service.js`) now REQUIRES `ADMIN_PASSWORD_HASH`.
- Missing hash → HTTP 500 `"ADMIN_PASSWORD_HASH is not configured. …"` — even if the request supplies the correct legacy plaintext password. Verified in an isolated environment (temp dir, `.env` without the hash): correct plaintext password returned **500 in 368 ms**, not a token.
- Malformed/wrong hash → `bcrypt.compareSync` false → standard 401 (safe failure).
- Response contract unchanged: 400 missing fields, 401 `Invalid email or password`, 200 `{success, token, admin}`.
- Customer password authentication untouched.
- No secrets printed or committed; local `.env` already contains a 60-char hash and valid logins were verified against it.

## 5. Helmet configuration (exact)

```js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://images.unsplash.com'],
      connectSrc: ["'self'", 'https://unsorted-backend.onrender.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

Rationale: `'unsafe-inline'` script/style is required by the still-mounted legacy page (removed in Phase 2); img-src covers Cloudinary + Unsplash imagery; Razorpay CDN deliberately absent (dead/placeholder); React frontends are served by Vercel with their own headers and are unaffected. `upgrade-insecure-requests` (a Helmet default) is production-only so plain-HTTP local dev doesn't rewrite its own assets to https.

Headers verified on live responses (`/api/health`, customer API, admin API):
`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (+ CSP `frame-ancestors 'self'`), `Referrer-Policy: no-referrer`, `Strict-Transport-Security: max-age=31536000; includeSubDomains` (honored over HTTPS; harmless locally), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: cross-origin`. Production boot additionally emits `upgrade-insecure-requests` in the CSP (verified).

## 6. CORS findings and deployment requirements

Code behavior (verified with production-mode boots on isolated ports):
- Allowed origin → `Access-Control-Allow-Origin` reflected + `Access-Control-Allow-Credentials: true`; preflight 204 with correct allow-methods/headers.
- Unapproved origin → **no** ACAO header (browser blocks).
- Production with empty `CORS_ORIGINS` → fails closed (no origin allowed) **plus** new loud boot warning.
- Development mode allows any localhost/127.0.0.1 port (5173/5174 verified); non-local origins blocked.
- Requests without `Origin` (curl/health checks) allowed — not CORS requests.

Deployment requirement (**not verifiable from this repository**):
- The deployed storefront calls `https://unsorted-backend.onrender.com` directly cross-origin (`frontend/src/services/api.js`), so Render MUST have `CORS_ORIGINS` set to the deployed frontend origin(s), comma-separated. The repository cannot prove the current Render value; `https://unsorted-swart.vercel.app` appears only as a documented example and was used solely as a local test value — it is NOT confirmed as the production origin.
- Operator must set/verify in Render: `CORS_ORIGINS=<verified storefront origin(s)>` (and the admin dashboard's deployed origin if it calls the API cross-origin).
- Admin frontend builds with `VITE_API_URL`; root `vercel.json` rewrites `/api/*` to Render (same-origin path, no CORS involvement).

## 7. Security regression results

- Customer login contract intact (401 identical message for unknown email vs wrong password — no enumeration; verified).
- Admin login works via bcrypt hash; invalid credentials → existing safe 401; missing fields → 400.
- Protected endpoints without token → 401 JSON.
- Role separation: customer JWT on admin endpoints → 403; admin JWT on customer endpoints → 403 (both directions verified).
- Rate limiting does not affect unrelated endpoints (verified during bursts).

**Additional correctness fixes (crash-safety):** `GET /api/customer/auth/me` was an unwrapped async handler; a rejection (deleted account / DB failure) escaped Express 4's error handling as an unhandled rejection and **killed the process** — reproduced live with a probe token, then fixed. The same latent bug was wrapped in `asyncHandler` on: `GET /api/auth/me`, `GET /api/customer/addresses`, `GET /api/customer/orders`, `GET /api/customer/profile`, `GET /api/customer/wishlist`. No business logic changed; success paths identical; rejections now render proper JSON errors. These are correctness fixes within the auth/regression surface, listed here explicitly for review.

## 8. API regression results (read-only probes)

`GET /api/products` 200 · `GET /api/products/1` 200 · admin `products` / `orders` / `customers` / `dashboard` / `dashboard/stats` all 200 with admin token · customer `orders` / `wishlist` / `addresses` 200 with customer token · guest cart read 200. Order placement/cancellation/invoice were not exercised because they require DB writes (forbidden this sprint); their code paths are untouched by this diff (invoice is frontend-only, rendered from order data). Cart architecture, wishlist, checkout, search, Razorpay: untouched.

## 9. Build/lint results

- `backend`: `node --check` on all 11 touched JS files — 0 failures; server boots clean; `/api/health` → 200 `{"status":"ok"}`.
- `frontend`: `npm run build` ✓ (built in ~6 s).
- `admin-frontend`: `npm run lint` exit 0; `npm run build` ✓ (~1.2 s; pre-existing >500 kB chunk warning = finding M3, out of scope).
- `git diff --check`: clean (only informational CRLF notices on package files).

## 10. Database baseline verification

Read-only counts (service-role client, `count=exact`, head): `products=15` (14 active — boot logs before and after testing both show "Products (Supabase): 14"; the extra row is a hidden `is_active=false` product, pre-existing), `categories=7`, `users=2`, `orders=3`, `order_items=6`, `cart_items=9`, `wishlist=3`, `addresses=0`. No schema or data changes were made; all probes were GETs, invalid-payload POSTs, unknown-email auth attempts, or failed logins (zero writes). No migrations touched.

## 11. Limitations requiring deployment configuration

1. **Render `CORS_ORIGINS`** must be set to the verified deployed storefront origin(s) — cannot be confirmed from the repo (§6).
2. **Render `ADMIN_PASSWORD_HASH`** becomes REQUIRED once this code deploys: without it, admin login returns 500 by design. Operator must set a bcrypt hash in Render before/at deploy (generate: `node -e "console.log(require('bcryptjs').hashSync('<password>',10))"` — never commit the output).
3. **`app.set('trust proxy', 1)`** assumes Render's single-proxy topology (standard). Required for correct per-client rate-limit keying; express-rate-limit otherwise refuses proxied requests.
4. Rate-limit counters use the in-memory store: per-instance, reset on restart/deploy. Fine for the current single Render instance; a shared store would be needed for multi-instance scaling.
5. Local `.env` values were used only in-memory for verification; never printed, never committed, never modified.

## 12. Remaining Sprint 22.6 work

- **Phase 2 / P2 (blocked on production confirmation):** legacy site removal (C1, C2, M1, L3, L4, L5) + L6 dead `SESSION_SECRET` cleanup; then tighten CSP (`'unsafe-inline'` removal).
- **P3 decisions:** H1/H2 token architecture review; H6 env-driven frontend API base.
- Deployment checklist items in §11.

## 13. Git status

Nothing committed/pushed/staged. Working tree vs `f284abd`:
- Modified: the 13 files in §2.
- New: `backend/middleware/rateLimit.middleware.js`.
- Untracked, intentionally NOT part of the commit: `.freebuff/`, `.opencode/`, `opencode.json` (local tooling). `SPRINT_22_6_SECURITY_VALIDATION.md` and this report are sprint docs — committing them alongside Phase 1 matches repo convention (prior `SPRINT_*.md` files are tracked), at the committer's discretion.
- `backend/.env` is gitignored and untouched.

## 14. Sprint 22.7 confirmation

No Analytics or Settings work was started, designed, or modified. All changes are limited to Sprint 22.6 P1 security work plus the crash-safety wraps documented in §7.
