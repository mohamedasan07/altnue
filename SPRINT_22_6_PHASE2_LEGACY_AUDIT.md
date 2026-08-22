# Sprint 22.6 — Phase 2 Final Legacy Removal Report

**Status:** IMPLEMENTED — legacy storefront/cart removal complete, verified, **not committed**.
**Base commit:** `4c2a014` (`feat: complete Sprint 22.6 analytics and admin settings`), `main`.
**Scope:** Approved Phase 2 items only — C1, C2, M1 (⊃ L3, L4, L5), M8-legacy, L6.
**Out of scope (untouched):** Helmet/CSP directives and their comments, CORS, rate limiting,
auth stacks, `/api/customer/cart` stack, checkout/orders/wishlist/addresses/products,
admin features, database schema/migrations, `vercel.json`, Render/Vercel config.

---

## 1. Files removed

All five git-tracked legacy root files (deleted via filesystem delete; nothing staged —
recoverable from git history at `4c2a014`):

| File | Lines | Role | Audit item |
|---|---|---|---|
| `index.html` | 614 | Legacy single-page storefront (hardcoded stale catalog C1) | M1/C1 |
| `style.css` | 1,211 | Legacy page styles (referenced only by old index.html:9) | M1 |
| `script.js` | 630 | Legacy page logic; posted to legacy `/cart`; innerHTML XSS surface (L4); inaccessible search modal behavior (L5) | M1/L4/L5 |
| `checkout_patch.js` | 51 | Best-effort POST of localStorage cart lines to legacy `/cart` | M1/C2 |
| `razorpay_checkout.js` | 151 | Client-side pseudo-Razorpay demo (placeholder key flow) | M8-legacy |

## 2. Files modified

| File | Change |
|---|---|
| `backend/server.js` | Removed `LEGACY_SITE_FILES` static-serving block + routes (`GET /`, `GET /index.html`, 4 asset routes); removed in-memory cart state `let cart = []` and `GET/POST /cart`, `PUT/DELETE /cart/:id`; pruned dead imports (`randomUUID`, `path`, `fileURLToPath`) and the now-unused path-resolution block; narrowed product.service import to `listProducts` only. Kept: `/image`,`/images` hard-404 guards, Helmet block byte-for-byte untouched, CORS, `/api` mount, JSON notFound, errorHandler. Net −99/+4 lines. |
| `backend/README.md` | Doc-only drift fix (sanctioned optional touch-up in approved audit §3): folder-structure comment for server.js updated; stale "Cart (in-memory, legacy customer-site sync)" API section replaced with a pointer to `/api/customer/cart`. |
| `backend/.env` (local, gitignored) | L6: removed the single unused `SESSION_SECRET` line. Value never read, printed, or committed. All other keys intact; file rewritten as BOM-free UTF-8 (PowerShell default would have added a BOM that could corrupt dotenv parsing — corrected and verified). |

## 3. Legacy dependencies removed

- Static serving of the five legacy files at `/`, `/index.html`, `/style.css`, `/script.js`,
  `/checkout_patch.js`, `/razorpay_checkout.js` (server.js).
- Legacy in-memory global cart endpoints at app root (outside `/api`): `GET/POST /cart`,
  `PUT/DELETE /cart/:id` — unauthenticated shared mutable array, superseded by
  `/api/customer/cart` since Sprint 21.3.
- Dead imports created solely for legacy functionality: `randomUUID` (crypto),
  `path`/`fileURLToPath`/`__dirname`/`projectRoot` resolution, `getProduct` import.
- Legacy Razorpay client implementation (`razorpay_checkout.js` + its `index.html`
  loader/inline placeholder key). No backend counterpart existed (no SDK, no order/
  signature/webhook endpoints — verified before deletion).

Pre-deletion dependency verification (architecture requirement): every reference to each
file was grepped repo-wide; consumers were exclusively the five legacy files themselves +
`backend/server.js`'s file list. Zero imports/fetches from `frontend/src` or
`admin-frontend/src`. No route, checkout flow, or React component referenced legacy `/cart`.

## 4. Modern functionality preserved

- `/api/customer/cart` stack (routes → controller → service → repository → Supabase,
  JWT-or-guest-`sessionId` scoping) — untouched, verified live below.
- Modern payment scaffold kept intact: `frontend/src/hooks/useCheckout.js:38` disabled
  razorpay option ("Coming soon") and `backend/validators/order.validator.js`
  `PAYMENT_METHODS = ['card','upi','netbanking','cod']` rejection of `razorpay`.
  No Razorpay was implemented.
- Customer auth, admin auth, rate limiting, Helmet/CORS configuration, trust proxy,
  boot warnings, orders/order history/cancellation/invoice/wishlist/addresses/products,
  admin customers/orders/dashboard/analytics/settings — all untouched and probed green.
- `frontend/`, `admin-frontend/` sources: zero modifications.

## 5. API regression (live probes against booted backend on :3001)

| Check | Result |
|---|---|
| Boot after edits (`node server.js`) | PASS — clean startup, no errors/warnings from removed files |
| `GET /api/health` | PASS — 200 `{"status":"ok"}` |
| `GET /api/products` | PASS — 200, 14 products |
| Admin auth `POST /api/auth/login` | PASS — 200 + token (credentials read from local env into memory only, never printed) |
| Admin guard negative (`/api/admin/dashboard` no token) | PASS — 401 |
| `GET /api/admin/products` / `orders` / `customers` | PASS — 200 with token |
| Admin dashboard/analytics (`/api/admin/dashboard`, `/stats`, `/sales`) | PASS — 200 with token (these feed Dashboard + Analytics pages; Settings is local-state only, no API) |
| Customer auth negative (bogus login) | PASS — 401 handled correctly |
| `GET /api/customer/orders` / `wishlist` unauthenticated | PASS — 401 (routes alive, guards intact) |
| **Modern guest cart round-trip** (`POST /api/customer/cart/items` → `GET` → `PUT` qty → `DELETE` cleanup, throwaway UUID sessionId) | PASS — 201/200/200/200, item visible then removed |
| **Legacy `/` , `/index.html`, `/style.css`, `/script.js`, `/checkout_patch.js`, `/razorpay_checkout.js`** | PASS — all 404 (gone) |
| **Legacy `GET/POST /cart`, `PUT/DELETE /cart/:id`** | PASS — all 404 |
| Route-wiring check (`routes/index.js`) | PASS — mounts only modern routers; nothing points at legacy cart |

No startup error from removed legacy files; no orphaned-import runtime faults.

## 6. Browser regression

Interactive browser click-through could not be executed in this CLI environment (no
browser automation installed; installing tooling/packages was out of scope). Equivalent
automated coverage performed:

- `frontend` production build passes (663 modules) — no broken imports/references.
- `admin-frontend` production build passes (792 modules), ESLint clean.
- Both Vite dev servers boot and serve HTTP 200 with the React root div
  (`localhost:5173`, `localhost:5174`); backend API probes above cover every endpoint
  those screens consume (listing/detail=products, cart=customer/cart, checkout/orders/
  invoice/cancellation=orders stack, wishlist, admin dashboard/analytics/settings).

Manual confirmation recommended on next dev run: full click-through of cart → checkout →
order placement → invoice → cancellation, wishlist toggling, and admin pages (console
should show no new errors — no code paths reachable by these apps were modified).

## 7. Build/lint

| Command | Result |
|---|---|
| `node --check backend/server.js` | PASS |
| `npm run build` (frontend) | PASS — built in 2.83s |
| `npm run lint` (admin-frontend) | PASS — zero findings |
| `npm run build` (admin-frontend) | PASS — chunk-size warning is pre-existing advisory, unrelated |

## 8. Security implications

- Removes an **unauthenticated, server-global mutable-state write endpoint** (`POST/PUT/
  DELETE /cart`) — genuine attack-surface reduction.
- Removes the legacy XSS-pattern surface (unescaped image interpolation into innerHTML
  sinks, L4) and the inaccessible search modal (L5) by deletion, per decision — not patched.
- Removes favicon-404 noise (L3) — moot with the page gone.
- Removes dead `SESSION_SECRET` from local `.env` — shrinks config confusion; nothing ever
  read it; secret hygiene maintained (value never exposed, `.env` never staged/committed).
- Helmet CSP intentionally left as-is this phase (protected area): `'unsafe-inline'`,
  cdnjs/fonts/Unsplash allowances remain but are now merely over-permissive for a
  JSON-only API, not a vulnerability. Tightening is unlocked and queued for the next pass.

## 9. Database verification

No migrations, no schema changes, no tracked SQL touched. Verification used read-only
probes plus one guest-cart round-trip scoped to a throwaway UUID `sessionId` whose line
item was deleted in the same session (approved audit §8 pattern). Production data
untouched; admin/customer logins exercised existing records only.

## 10. Remaining legacy references

Zero references in any active source (`*.js/jsx/json/html/css`). Remaining mentions are
documentation-only and deliberately preserved:

- `SPRINT_*.md` history docs — never retro-edited (audit §6 rule).
- This report and the historical audit content it supersedes (git-untracked working doc).
- `backend/server.js` Helmet comment block still narrates the legacy-page rationale
  (lines re: 'unsafe-inline', cdnjs/fonts, connect-src). Left untouched because Helmet is
  a protected area this phase; the comments become factually stale and should be rewritten
  during the deferred CSP-tightening pass.
- `.opencode/skills/*.md` tooling notes (unstaged tooling, out of scope).

## 11. vercel.json status

**UNCHANGED** — byte-identical, per instruction. Disposition deferred to deployment/H6-P3.

## 12. Final verdict

**PASS.**

- All approved Phase 2 items implemented exactly as scoped; protected areas untouched.
- Backend boots clean; health, products, both auth families, customer cart, orders,
  wishlist, dashboard/analytics/settings all green; legacy surface fully 404.
- Frontends build/lint clean; no active-code references to removed assets remain.
- Git hygiene respected: nothing staged, nothing committed, nothing pushed;
  `git diff --check` clean; tooling dirs (`.opencode/`, `.freebuff/`, `opencode.json`)
  unstaged. Diff stat: 7 files changed, 6 insertions(+), 2,758 deletions(−).

**STOP — Phase 2 complete. No commit/push/deployment/Sprint 22.7 work performed.**
