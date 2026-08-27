# Sprint 22.7 — DISCOVERY / AUDIT (READ-ONLY)

**Date:** 2026-08-22 · **Baseline:** `85f8934` (`refactor: remove legacy storefront and cart`) on `main`
**Mode:** Audit → Rank → Recommend → STOP. No code modified, nothing installed, no migrations, no commits, no pushes, no deployments. `.opencode/`, `opencode.json`, `.freebuff/` excluded throughout.

---

## 1. Executive summary

Sprints 22.1–22.6 left the platform in its strongest state yet: full admin operations surface (orders, analytics, customers), customer self-service (cancel/timeline/invoice/profile), hardened auth (bcrypt-only admin login, rate limiting, Helmet, CORS allow-list), and a clean repo after legacy-site removal. Final regression: PASS.

What remains falls into four buckets:

1. **A launch-blocking configuration fault** — the storefront's production API base and `vercel.json` both point at the **old project's** Render backend (`unsorted-backend.onrender.com`). Deploying today would silently serve live traffic to the wrong system.
2. **Core unfinished storefront functionality** — product discovery (search/filter/sort/pagination) is entirely client-side over an unpaginated full-catalog fetch; one sort option ("Best Selling") is a silent no-op because its field does not exist in any payload.
3. **Missing production plumbing** — password-reset mints valid tokens but has **no email delivery**, so in production the flow dead-ends; newsletter subscribe is fake; reviews have no submission path.
4. **Zero automated testing** — all verification is manual curl/browser passes.

**Recommendation: Sprint 22.7 = Server-side product discovery API + storefront integration.** It completes genuinely unfinished core functionality, fits the existing layered architecture exactly, requires **no migration**, is end-to-end testable, and touches none of the Sprint 22.5/22.6 surfaces. The deployment-config fix (candidate B) is flagged as a mandatory pre-deploy step that can ride along as a small phase or precede Sprint 22.8.

---

## 2. Current baseline

| Item | State |
|---|---|
| Branch | `main`, working tree clean |
| HEAD | `85f8934` refactor: remove legacy storefront and cart |
| Remote | reports "up to date with `origin/main`" (the 22.6 regression note listed `85f8934` as unpushed at that time; current git status says synced) |
| Recent history | `7d47bd9` (22.6 security), `4c2a014` (analytics+settings), `f284abd` (22.5 order self-service), `144d1e0` (22.4 wishlist), `d72d296` (22.3 customers), `9ffdce0` (22.2 dashboard analytics), `2bc84f7` (22.1 orders), `abc69d2` (21.3 checkout) |
| Untracked | `.freebuff/`, `.opencode/`, `opencode.json`, `SPRINT_22_6_FINAL_REGRESSION.md` (tooling + report docs only) |
| Data scale | ~14 public + 1 hidden products, 7 categories, 3 customers, 3 real orders |

## 3. Architecture overview (post-22.6)

```
frontend/ (React 18 SPA, fetch wrapper, dev proxy :3001)
admin-frontend/ (React 19 SPA, axios + interceptors, VITE_API_URL || '/api')
backend/ (Express 4 ESM :3001)
  routes/index.js → 13 routers
    /api/health · /products · /auth (admin) · /upload
    /customer/auth · /customer(/profile) · /customer/addresses
    /customer/cart · /customer/orders · /customer/wishlist
    /admin(/orders|dashboard|customers)
  controllers → services → repositories → Supabase (envelope pattern)
  validators (server-side pricing truth) · middleware (JWT guards, rate limit,
  helmet CSP, CORS origin fn, notFound, errorHandler)
database/: schema.sql + migrations 001–004 (categories, products, users,
addresses, wishlist, cart, cart_items, orders, order_items, order_status_history;
RLS everywhere; FK/hot-path indexes complete)
Legacy static site: REMOVED (85f8934). Root vercel.json remains (see §8).
```

Auth model unchanged: two JWT families off one secret; admin 24 h (`ADMIN_PASSWORD_HASH` required since 22.6), customer 7 d; ownership scoping enforced at service/repository layer.

## 4. Storefront audit (frontend/)

| Area | Status | Evidence / notes |
|---|---|---|
| Home | COMPLETE | Sections render real catalog data; no mock arrays found anywhere (`grep alert(\|console.log\|mockData\|dummyData)` → zero hits) |
| Collections + filters/sort | PARTIAL (client-side only) | `useFilters.js` filters/sorts in memory; `GET /api/products` accepts **no query params** (`product.routes.js:23`, `services/products.js:3-6`) |
| Search | PARTIAL (client-side only) | `useSearch.js:13-46` substring match over already-fetched array; no search endpoint exists |
| Pagination | MISSING | Collections renders every matched product; no page/limit concept in the public catalog path |
| "Best Selling" sort | BROKEN (silent) | `useFilters.js:206-211` sorts by `p.sold`; **no `sold` field exists on any payload** (grep confirms only dashboard best-sellers endpoint computes units) → always falls back to id order |
| Product detail/gallery | COMPLETE | Gallery, size/color selection, stock handling verified in 22.5/22.6 regressions |
| Cart | COMPLETE | Guest→customer merge, qty caps, ownership isolation all regression-verified |
| Checkout | COMPLETE | Real placement via `POST /customer/orders` with server-recomputed totals + idempotency key (`useCheckout.js:237-274`); Razorpay intentionally disabled (`PAYMENT_METHODS`) |
| Wishlist | COMPLETE | Guest local + server sync; inactive-product filtering verified |
| Login/register/forgot/reset | COMPLETE UI; PARTIAL delivery | Reset token crypto solid (SHA-256-at-rest, single-use, TTL, anti-enumeration); **production sends nothing** — link only logged + `devResetUrl` in dev (`customerAuth.service.js:209-215`); no nodemailer dependency |
| SocialLogin | PLACEHOLDER | Three buttons with empty onClick, "no social provider backend yet" (`SocialLogin.jsx:52-68`) — UI-only since Sprint 11 |
| Profile edit | COMPLETE | `PUT /api/customer/profile` wired (`user.routes.js:19`, `AuthContext.updateProfile`) |
| Change password (authenticated) | MISSING | Only path is forgot/reset flow (which lacks prod delivery); no `PATCH /password` endpoint |
| Orders/cancel/timeline/invoice | COMPLETE | Regression §8 verified end-to-end |
| Track Order button | DEAD UI | `aria-disabled` stub on every order card — "arrives with a backend" (`OrderCard.jsx:86-93`) |
| ProfileDropdown menu | STALE | Shows disabled "Orders — Soon" though `/account/orders` is live (`ProfileDropdown.jsx:109-114`) — hides a shipped feature |
| Newsletter | FAKE | Submit flips local state only; "You're on the list" with zero persistence and no endpoint/table (`Newsletter.jsx:10-13`) |
| Settings toggles (notifications/privacy) | COSMETIC | localStorage-only (`settingsStorage.js`); control nothing server-side |
| Footer | MINOR DEBT | "About" and "Journal" both mislabeled links to `/collections` (`Footer.jsx:19-20`) |
| Reviews/ratings | MISSING WRITE PATH | Rating stars displayed from static DB columns; no review endpoints/tables/UI exist |
| Error/loading/empty states | COMPLETE | Consistent Loader/ProductGrid-empty/retry patterns across pages |
| Stale docs | Minor | `useCheckout.js:145` claims "local order record. No backend." — false since 21.3; comment only |

## 5. Admin audit (admin-frontend/)

| Area | Status | Evidence / notes |
|---|---|---|
| Login/auth context | COMPLETE | Token storage, global 401 teardown interceptor excluding login (`services/api.js`) |
| Dashboard | COMPLETE | Stat cards, sales chart, recent orders, low stock, best sellers, activity feed — math cross-checked in 22.6 regression §9 |
| Analytics | COMPLETE | `/stats` + `/sales?months=` zero-filled trends; cancelled excluded from revenue/AOV (verified numerically) |
| Settings | COMPLETE (by design) | Read-only identity + session expiry decoded from real JWT exp; honest credential-rotation guidance; no fake writability (`SettingsPage.jsx:9-19`) |
| Products CRUD | COMPLETE | List/search/filter/status; create/edit/hide; Cloudinary upload; QA round-trip verified |
| Orders | COMPLETE | Server-side pagination/search/filters (`order.service.js:14,30-41`); status transitions append exactly one history row; same-status PATCH no-op |
| Customers | COMPLETE | Server-side list + aggregate detail drawer + Saved Items incl. inactive-product rendering |
| Category management | **MISSING ENTIRELY** | No categories API, no admin UI. Admin category filter is derived ad-hoc from product rows (`ProductsPage.jsx:92`); DB table's `image_url`/`sort_order` are dead columns; repo helpers only map slug→FK internally (`product.repository.js:131-187`) |
| Topbar global search | DEAD UI | Input has no value/onChange/handler (`Topbar.jsx:21-28`) |
| Notifications bell | DEAD UI | Cosmetic badge dot, no handler, no notification system (`Topbar.jsx:32-35`) |
| Pagination | COMPLETE | Server-side (`page/limit/total/totalPages`) across orders/customers; products loads full list (acceptable at current scale) |
| Navigation/accessibility | COMPLETE | Sidebar routes guarded; aria labels present; lint clean |

## 6. Backend audit

**Route/guard map:** all 13 routers enumerated in §3; every customer route under `authorize('customer')`, admin writes under `authorize('admin')`; rate limiters on register/login/forgot-password (draft-8 headers, generic bodies — no enumeration leaks); `trust proxy = 1` correctly set for Render (`server.js:31`).

**Genuine missing functionality**
- **Email transport absent**: no nodemailer/SMTP anywhere in deps or code; forgot-password logs the link and returns `{success:true}` in production (`customerAuth.service.js:213-215`). Reset flow itself is production-grade; delivery channel is the gap. Same infrastructure would carry order-confirmation email.
- **No reviews endpoints/tables** — ratings are static admin-set values.
- **No coupons infrastructure** — `WELCOME10`/`UNFILTERED15` hardcoded in `order.validator.js:43-44`; infinitely reusable, no per-user tracking, no admin management (client mirror in `cartConfig.js`). Acceptable today, abuse-prone once traffic arrives.
- **No notifications system** (matches admin's dead bell).
- **Public catalog API has no query capabilities** — no q/category/price/sort/page params; everything downstream is client-side (drives the Sprint recommendation).

**Intentionally deferred (NOT gaps):** Razorpay (validator rejects; UI option disabled); social login; admin settings write-path; plaintext ADMIN_PASSWORD fallback (correctly neutered).

**Health/error/validation:** `/api/health` 200; JSON 404 for unknown `/api/*`; ApiError envelope consistent; validators recompute all money server-side; ownership scoping verified across carts/orders/wishlists. No N+1 patterns found; dashboard aggregates raw rows in JS (fine at this scale). Legacy `/image*` stubs return 404 correctly; `/cart*` gone.

**Leftover 22.6 debt (documented, queued):** Helmet CSP still carries legacy-era allowances (`'unsafe-inline'`, cdnjs, unsplash) and `connect-src https://unsorted-backend.onrender.com` for a site that no longer exists (`server.js:59-76`) — tightening was explicitly deferred post-Phase-2.

## 7. Database audit (read-only)

- Schema (`schema.sql`) and migrations `001–004` agree; RLS on all 9 tables; FK + hot-query indexes present (`orders.placed_at desc`, reset_token partial lookups, one-default-address partial unique, etc.). **No drift detected; nothing broken.**
- **Unused/dead columns:** `categories.image_url`, `categories.sort_order` — written by nobody, read by nobody (category nav derives from product payloads instead).
- **Missing-for-future features (do NOT migrate yet):** reviews table, newsletter subscribers table, coupons table, notifications table, customers.email change-flow support. All belong to their feature sprints, not a speculative migration.
- **Should NOT get a migration now:** anything for candidates C–G below beyond what exists; in particular *no* index additions are needed for the recommended sprint — `idx_products_category` + `idx_products_active` already cover the planned query shapes, and full-text/trigram search indexing is premature at 15 rows.

## 8. Deployment readiness audit (nothing deployed; nothing modified)

**ACTIVE BLOCKER — wrong-target configuration (must fix BEFORE any deploy):**
1. `frontend/src/services/api.js:8` — `REMOTE_BASE = 'https://unsorted-backend.onrender.com'` hardcoded; used for ALL production calls. There is **no `VITE_API_URL` support in the storefront at all** (unlike admin). A new Vercel deploy of `frontend/` would read/write the **old project's** production database.
2. `vercel.json` (repo root) — rewrites `/api/(.*)` to the same old Render URL. Also stale in shape: it assumes a single Vercel project serving the API-proxied SPA; the new topology is **two** Vercel projects (storefront + admin) with root-directory builds, so each needs its own rewrite/config.
3. `backend/server.js:67` — CSP `connect-src` pins the old Render host (legacy leftover).

**NEW BACKEND (Render) checklist — env vars required:** `NODE_ENV=production`, `PORT` (Render-injected), `JWT_SECRET` (fresh), `ADMIN_PASSWORD_HASH` (required — login 500s without it), `ADMIN_EMAIL/ADMIN_NAME/ADMIN_ROLE`, `SUPABASE_URL/_SERVICE_ROLE_KEY` (new project's keys), `CLOUDINARY_*`, `CORS_ORIGINS` (**both** new Vercel origins, comma-separated; boot warns loudly if empty), `FRONTEND_URL` (new storefront origin — feeds reset links), optional `RATE_LIMIT_*`. Build/start: `npm start` (`node server.js`); health check `/api/health`. `trust proxy` already correct.

**NEW STOREFRONT (Vercel):** requires the candidate-B change (env-driven API base or per-project rewrite pointing at the NEW Render URL) + `npm run build` (already green). **NEW ADMIN (Vercel):** already correct via `VITE_API_URL` env + build; add an `.env.example` documenting it (only `backend/.env.example` exists today).

## 9. Testing / CI audit

- **Automated tests: zero** across all three apps. Backend `package.json` has no `test`/`lint` scripts; storefront has neither; admin has ESLint only.
- **CI/CD: none** (no `.github/` directory). Builds/lint run manually per sprint.
- Current practice = scripted curl/API suites during sprint phases + owner browser pass + `node --check` + production builds. Effective but unrepeatable and unguarded against regressions between sprints.
- **Most valuable improvement (not implemented here):** a dependency-free Node API smoke/regression harness (health → auth matrix → catalog → cart merge → order lifecycle → idempotency replay → cancellation stock restore → analytics math spot-checks), runnable pre-commit and later in CI. High leverage precisely because every recent sprint's correctness was proven this way manually.

## 10. Security / technical-debt state

**ACTIVE PRODUCTION RISK**
- Wrong-backend configuration trio (§8 items 1–3) — deploying without fixing points real users at the old system.
- Password-reset with no delivery ⇒ in production, forgotten passwords = permanent lockout (and support burden lands on manual DB edits).
- CSP `connect-src`/legacy allowances: harmless locally, but shipping them advertises and permits a defunct origin; tightening was already queued.

**DEFERRED TECHNICAL DEBT**
- Client-side-only discovery (scale ceiling; broken bestsellers sort is a correctness bug inside this bucket).
- Hardcoded coupons (reusable forever; no redemption ledger).
- localStorage-only settings/newsletter fakes (misleading UX, no data).
- No tests/CI (process risk, not runtime risk).

**LEGACY / DEAD CODE**
- Dead UI: SocialLogin buttons, Track Order stub, ProfileDropdown "Orders—Soon", Topbar search + bell, footer About/Journal links.
- Dead schema: `categories.image_url`, `categories.sort_order`.
- Stale comments: `useCheckout.js:145`.

Dependency posture: `npm audit fix` deliberately not run (22.6 policy); no known vulnerable runtime paths; secrets confined to gitignored `.env`s.

## 11. Ranked Sprint 22.7 candidates

### A. Server-side product discovery (search/filter/sort/pagination) — **P0 ★RECOMMENDED**
- **Problem:** Public catalog API returns the entire table with zero query support; all discovery runs client-side; "Best Selling" sorts on a nonexistent field (silent wrong behavior); no pagination.
- **Value:** Completes the storefront's core job properly; fixes a real correctness bug; makes catalog growth safe; aligns public API with the proven admin pagination pattern.
- **Layers:** backend validator/repository/service/controller + storefront services/hooks/pages.
- **Likely files:** `backend/validators/product.validator.js`, `backend/repositories/product.repository.js`, `backend/services/product.service.js`, `backend/controllers/product.controller.js`, `frontend/src/services/products.js`, `hooks/useFilters.js`/`useSearch.js`/`useProducts.js`, `pages/CollectionsPage/*`, `components/ProductGrid/*`, `components/search/*`.
- **Migration:** NOT required (indexes exist; sold-count derivable from `order_items` aggregation; text-search index deferred until scale demands).
- **Security risk:** Low — new query surface must be allowlisted (sort keys, capped page size, clamped price bounds) to avoid injection-by-parameter and unbounded queries; straightforward in existing validator style.
- **Complexity:** Medium implementation / medium verification. **Dependencies:** none external.
- **Why 22.7:** highest genuine unfinished-feature value with lowest structural risk; protects 22.5/22.6 by touching none of their code paths.

### B. Production configuration unification (deploy-readiness) — **P0 (pre-deploy gate, small)**
- **Problem:** §8 trio — storefront hardcodes old backend, root `vercel.json` targets old backend, CSP pins old host; no env-driven base URL in storefront.
- **Value:** Nothing else matters if first deploy hits the wrong system. Unblocks all future deploys.
- **Layers:** storefront api client + vercel configs + backend CSP line + `.env.example`s.
- **Migration:** none. **Security risk:** reduces active risk. **Complexity:** low.
- **Why not sole 22.7:** mostly configuration, little new user-facing function — but should be phased into 22.7 or immediately precede deploy. (Listed small enough to ride along; see §13 note.)

### C. Transactional email (reset delivery [+ order confirmation]) — **P1**
- **Problem:** production forgot-password dead-ends (§6).
- **Value:** restores self-service account recovery; professional order emails.
- **Layers:** backend service + new mail util + env (`SMTP_*`); optional storefront copy tweaks.
- **Migration:** none. **Risk:** low-moderate (credential handling, sending-domain setup). **Complexity:** medium, plus **external provider decision/setup outside codebase**.
- **Why not:** blocked on choosing/owning an SMTP provider (SendGrid/Resend/etc.) — a business decision, not just code.

### D. Customer reviews & ratings — **P2**
- Needs new table + RLS + moderation + UI + rating recomputation; biggest scope on the board; real value but poor scope-to-risk for one sprint right after a hardening cycle.

### E. Category management (public categories API + admin CRUD) — **P2**
- Activates dead `image_url`/`sort_order` columns, gives admins real taxonomy control, lets storefront stop deriving categories from payloads. No migration needed. Good *future* sprint; lower daily-user impact than A.

### F. Newsletter/contact capture — **P2/P3**
- Replaces a deceptive fake with a real subscribers table + endpoint + admin export. Small, but niche value vs A; natural pairing with C later.

### G. Coupon system upgrade (DB-backed, usage-limited, single-use) — **P2**
- Removes abuse exposure before real traffic. Requires migration + admin UI + validator rework. Important, not urgent while traffic ≈ 0.

### H. Automated API regression harness — **P1 leverage / P3 timing**
- Codifies what every sprint does manually. Cheap-ish, huge future payoff; excellent companion inside any sprint's Phase 5 rather than consuming a whole slot now.

### I. UX-debt cleanup sweep (dead buttons/stale labels/footer links/stale comments) — **P3**
- An afternoon of honesty fixes (remove or wire Track Order → timeline deep-link, drop "Orders—Soon", fix About/Journal, remove SocialLogin or hide behind flag). Valuable polish; too thin alone for a sprint number.

## 12. Recommended Sprint 22.7

**Server-side product discovery API + storefront integration (Candidate A)** — optionally including Candidate B's three-line-class config corrections as an explicit early phase, since both are prerequisites for a truthful production launch and B is otherwise trivially forgettable.

Selection criteria scorecard: real user value ✔ (every shopper touchpoint) · meaningful unfinished functionality ✔ (core discovery + a live bug) · architectural fit ✔ (extends layered stack exactly like admin lists already do) · reasonable scope ✔ · e2e-testable ✔ · zero migration risk ✔ · no rewrites ✔ · 22.5/22.6 protection ✔ (disjoint files).

## 13. Proposed phases

- **Phase 1 — Backend foundation:** extend `product.validator.js` with query parsing (allowlisted `sort` set incl. `bestsellers`, `page`≥1, `limit` capped ≤48 default 12, `minPrice/maxPrice` clamped ≥0, `sale`/`instock` booleans, `category` slug, `q` length-capped); repository gains count + filtered-select queries reusing existing indexes.
- **Phase 2 — Core functionality:** service composes filters; `bestsellers` computed from `order_items` units-per-product aggregation (delivered products only) — no schema change; response becomes `{ success, products, pagination }` while keeping backward-compatible fields where cheap.
- **Phase 3 — Frontend:** `services/products.js` passes params; `useProducts` refetches on filter/sort/page changes; `useFilters`/`useSearch` switch from in-memory mutation to param authoring (URL sync preserved); CollectionsPage gains pagination controls + result counts; search overlay uses server results; remove/repair `sold` fallback logic.
- **Phase 4 — Browser verification:** every filter/sort/page combination against seeded QA products; empty-state, error-retry, deep-link refresh (`?…` survives reload), mobile drawer parity.
- **Phase 5 — Regression:** rerun 22.6-style API suite (auth matrix, cart merge, order lifecycle, wishlist, analytics math) proving zero drift; product detail/cart/wishlist flows unaffected.
- **Phase 6 — Final audit:** document results, close out open findings (incl. CSP tightening note for 22.8).
- **Phase 7 — Commit:** single `feat:` commit per house convention; no push unless instructed.

*(If B rides along: it slots as Phase 0 — storefront env-aware API base + fresh `vercel.json` per project + CSP `connect-src` cleanup + admin `.env.example`.)*

## 14. File scope

**CREATE:** `SPRINT_22_7_AUDIT.md` (this file) · *(if B included)* `admin-frontend/.env.example`, replacement per-project Vercel configs. **No migration files.**

**MODIFY (likely):** `backend/validators/product.validator.js` · `backend/repositories/product.repository.js` · `backend/services/product.service.js` · `backend/controllers/product.controller.js` · `frontend/src/services/products.js` · `frontend/src/hooks/useProducts.js` · `useFilters.js` · `useSearch.js` · `frontend/src/pages/CollectionsPage/CollectionsPage.jsx(+css)` · `frontend/src/components/ProductGrid/*` · `frontend/src/components/search/SearchOverlay/*` *(Phase 0 only:* `frontend/src/services/api.js`, `vercel.json`, `backend/server.js` CSP block*)*

**PROTECT (untouched):** all `*order*`, `*cart*`, `*wishlist*`, `*customer*`, `*dashboard*`, `auth*` backend modules from 22.5/22.6; `middleware/*` (rate limits, guards); `database/schema.sql` + `migrations/`; `.env*` files; admin-frontend except nothing; excluded tooling (`.opencode/`, `opencode.json`, `.freebuff/`); `SPRINT_*.md` history.

**MIGRATION:** **Not required.** Explicitly deferred: trigram/text index on `products.name/description` (revisit only when p95 degrades at realistic scale).

## 15. Database / migration plan

None for 22.7. Future sprints own: reviews tables (D), subscribers (F), coupons ledger (G), notifications (admin bell), `categories` activation (E) — each bringing its own migration + RLS policy + `schema.sql` sync per house rules. Nothing speculative gets created now.

## 16. Risks

1. Response-shape change on `GET /api/products` could break older consumers — mitigated: only consumers are our two frontends, updated in the same sprint; regression suite gates it.
2. Query-surface abuse (unbounded scans) — mitigated by validator allowlists + hard caps; indexes already cover shapes.
3. Bestsellers semantics (all-time vs windowed) — decide in Phase 2; default all-time delivered units, documented in-code.
4. Scope creep into search-quality features (typo tolerance etc.) — explicitly out; substring parity only.
5. If Phase 0 included: touching deploy configs risks confusion with OLD project assets — mitigated by creating NEW configs only, never editing the old deployment's settings, and never deploying in-sprint.

## 17. Verification strategy

API-level (curl/PowerShell suites, mirroring 22.6 discipline): param matrix (valid/invalid/clamped/oversized), pagination math (`total/totalPages`), sort ordering spot-checks incl. real bestsellers numbers vs `order_items` sums, auth-neutrality of public reads, 404-on-hidden-product retention. Browser-level: full discovery journey, URL deep-links, refresh persistence, empty/error states, mobile drawer. Build/lint gates: `node --check`, both frontends' production builds, admin lint. Then the standing full-regression suite for 22.5/22.6 surfaces.

## 18. Explicitly deferred work

Email delivery (C — pending provider choice) · reviews (D) · category management (E) · newsletter capture (F) · coupon hardening (G) · dedicated test harness sprint slice (H) · UX-debt sweep (I) · social login · Razorpay · CSP final tightening (queued from 22.6) · authenticated password-change endpoint · search-quality (fuzzy/typo) · admin global search & notifications systems · trigram indexes.

## 19. Final recommendation

Proceed with **Sprint 22.7: server-side product discovery (Candidate A), including Phase 0 config-truth fixes (Candidate B) if approved.** Highest genuine user-facing incompleteness, one live bug fixed, exact architectural continuity with the admin patterns already proven in 22.1–22.3, zero migration exposure, fully verifiable, and it leaves every Sprint 22.5/22.6 surface untouched.

**STOP — awaiting approval before any implementation.**
