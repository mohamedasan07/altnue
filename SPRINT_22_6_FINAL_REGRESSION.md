# Sprint 22.6 — FINAL FULL REGRESSION REPORT

**Date:** 2026-08-22 · **Baseline:** `85f8934` (`refactor: remove legacy storefront and cart`) on `main`
**Scope:** Full regression of Sprint 22.6 (P1 security, analytics/settings, P2 legacy cleanup) against the committed baseline. No new features; no code modified; nothing committed/pushed/deployed.

> **State note (checked FIRST as instructed):** Phase 2 was found **committed** (`85f8934`, authored by the repo owner at 11:05 IST) rather than *staged* as described. Content was verified to match the Phase 2 audit exactly (identical file set and line counts + the final audit report doc); working tree clean apart from known untracked tooling. Per owner decision, regression proceeded against `85f8934` as baseline.

---

## 1. Git baseline
- `git log`: Sprint 22.6 commits present — `7d47bd9` (P1 auth/API security), `4c2a014` (analytics+settings), `85f8934` (Phase 2 legacy removal). Branch up to date with `origin/main` **excluding** `85f8934` (unpushed).
- Working tree clean; only untracked tooling: `.freebuff/`, `.opencode/`, `opencode.json` (excluded from all work, never staged).
- `git diff --cached --check`: CLEAN (nothing staged). No commits/pushes performed during this regression.

## 2. Backend health
- Clean boot of committed code on `:3001`. Supabase client initialized → connected (`categories: 7`), Cloudinary configured → connected.
- One transient boot-log line: first product-count query raced Supabase token issuance (`JWT issued at future`), self-recovered immediately; `/api/products` verified 200/14 items afterwards. Pre-existing timing quirk, not a regression.
- `GET /api/health` → 200 `{"status":"ok"}`. Public products → 200, 14 active items. No startup crashes.

## 3. Security regression (headers/CORS/rate limits)
- **Headers on every response:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (+ CSP `frame-ancestors 'self'`), full CSP present (legacy-era allowances intact — untouched per scope), `Referrer-Policy: no-referrer`, HSTS `max-age=31536000; includeSubDomains`, CORP `cross-origin`.
- **CORS (dev):** `Origin: http://localhost:5173` → ACAO reflected; unknown origin → no ACAO withheld correctly. **Production CORS is NOT verified** — deployment step when Render/Vercel wiring happens (`CORS_ORIGINS` allow-list).
- **Rate limiting:** admin login blocked with 429 exactly at its cap of 10/window (11th request); customer login 429s confirmed past its 20/window cap (draft-8 `RateLimit`/`RateLimit-Policy` headers present; generic body, no account-existence leak). Note for local testing: buckets are per-IP in-memory — restart backend to clear (they were left exhausted by this suite).

## 4. Customer auth regression
- Register QA account → 201; explicit login → 200; `/api/customer/auth/me` → 200 with correct profile claims.
- Invalid credentials → 401. Garbage/forged token on `/me` → 401.
- Protected endpoints without token → 401 (`orders`, `wishlist`). With QA token → allowed.
- **Cleanup:** QA customer deleted afterward (see §15).

## 5. Admin auth & guards
- Valid admin login → 200 token; `/api/auth/me` → `{ name, email, role }` only — no secrets/password material.
- Invalid admin login → 401 (fail-closed; hash-based path active since `ADMIN_PASSWORD_HASH` is set).
- Customer token on admin API → **403 Forbidden**; no token → **401**. Distinction intact.
- Session model: admin JWT lifetime 24 h (`exp` claim verified).

## 6. Cart regression
- Guest add (201) → update qty (200) → merge into customer cart (200, cart adopted) → customer cart shows correct owner/lines/subtotal (₹4797 = 3×1599).
- Ownership isolation: a fresh guest session sees only its own (empty) cart — no cross-session leakage.
- Legacy `/cart*` routes remain gone (§13).

## 7. Wishlist regression
- Add 201; duplicate re-add idempotent (list count stayed 1); remove 200; repeat remove idempotent 200.
- Nonexistent product → 404.
- Inactive product handling: hidden product **excluded from customer wishlist responses** (no ghost "Untitled"); **admin Saved-Items view** still lists it with `isActive:false` so the UI can render "unavailable"; after product deletion the wishlist row cascades away — zero ghosts in both views.
- Guest-localStorage side + logout/login behaviors were covered by the owner's completed manual browser pass (API sync surface verified above).

## 8. Orders / cancellation / history / invoice
QA-only data used; real orders never touched.
- **Placement:** from cart with server-recomputed totals (subtotal 4797, GST 240, free shipping ≥₹2499 applied, grand total 5037 ✓ exact math). Status `pending`, paymentStatus `pending`, COD. Stock decremented once (55→52).
- **History:** exactly ONE `pending/system` row at creation.
- **Idempotency replay:** same key → HTTP 200, same order id, `replayed:true`; order list count stayed 1 — no duplicate, no duplicate history.
- **Cancellation:** pending order cancels → status `cancelled`; stock restored exactly once (52→55); history gains exactly one `cancelled/customer` row (real timestamp).
- **Repeat cancellation:** safe 200 no-op replay — no stock change, no new history rows.
- **Timeline:** real DB timestamps, oldest-first, no fabricated states.
- **Invoice source data:** complete snapshot (items w/ price/size/color, shipping address, totals breakdown, payment method) with **no secrets and no fabricated payment info** (paymentStatus stays `pending`).

## 9. Admin dashboard
- Aggregate endpoint 200: stat cards (revenue/orders/customers/products/AOV/pending/cancelled), monthly sales overview, recent orders, low-stock, best-sellers, latest customers, activity feed — all 200 and populated with real Supabase data.
- Cross-checked revenue/AOV mathematically against raw order rows: revenue = ₹10,309 = sum of the 3 non-cancelled orders only; AOV = 10309/3 = 3436.33 exactly; cancelled/refunded excluded ✓.

## 10. Analytics
- `/stats` provides Revenue, Orders, AOV, customers, status breakdowns, payment breakdown; `/sales?months=6|12` returns correctly sized zero-filled trends (6 vs 12 points).
- Cancelled orders excluded from revenue/AOV (verified numerically); trend order counts reflect all placements (consistent with `totalOrders` semantics — not fabricated).
- Zero-data months render as zeros. Empty/error states covered by the owner's manual browser pass.

## 11. Settings
- Server-derived identity via `/api/auth/me` (name/email/role, read-only); JWT expiry = 24 h session window verified from token claims; credential rotation surfaced via hash-required login behavior (plaintext fallback disabled when hash present).
- No secrets/passwords exposed in any response. Customer token cannot reach any settings-bearing admin API (403).

## 12. Admin products
- List/search/filter via admin list (all products incl. hidden); create → 201 (public catalog 14→15); edit price/name → persisted; `is_active:false` hides from public catalog (public detail → 404) while remaining visible to admin.
- Cloudinary upload flow not exercised here (needs real image upload; UI covered by owner's manual pass).
- **Restored:** temp QA products deleted (catalog back to exactly 14 public + 1 pre-existing hidden).

## 13. Admin orders
- Paginated/searchable/filterable list verified (envelope `{ success, orders, pagination }`).
- Status transition pending→confirmed adds **exactly one** `confirmed/admin` history row; **same-status PATCH is a no-op** (no new row, unchanged payload); payment-status update (`paid`) changes paymentStatus and adds **NO** history event. All tested on a temporary QA order only.
- Real timeline rows carry real timestamps; real orders untouched throughout.

## 14. Admin customers
- List with pagination (page/totalPages verified), search (email match), allowlisted sort (`created_at`; non-allowlisted sort values correctly rejected 400), status filter.
- Detail drawer single endpoint returns profile + stats + addresses + orders + activity together; activity feed derived from real events.
- Saved Items: inactive products display with `isActive:false` (unavailable), deleted products cascade out — no ghosts.

## 15. Auth matrix & ownership
| Caller | Customer API | Admin API |
|---|---|---|
| No token | 401 | 401 |
| Customer token | allowed | 403 |
| Admin token | n/a (guard) | allowed |

- Ownership scoping: guest carts isolated per sessionId; merge adopts guest cart into the authenticated user's cart; customer endpoints always scoped to `req.user.id` (order/wishlist/cart operations all returned only that principal's data during the suite).

## 16. Legacy cleanup verification (Phase 2)
- `GET /`, `/index.html`, `/style.css`, `/script.js`, `/checkout_patch.js`, `/razorpay_checkout.js` → **404**; `GET /cart` → **404**.
- Repo grep: ZERO references to deleted files / `LEGACY_SITE` / `SESSION_SECRET` in any active source.
- React cart uses `/api/customer/cart…` exclusively; checkout uses `/api/customer/orders`.
- Modern disabled Razorpay option (`useCheckout.js:38`) + validator rejection (`order.validator.js` PAYMENT_METHODS) intact; no Razorpay implemented.
- `vercel.json`: byte-identical to HEAD (untouched).

## 17. Builds / lint
- `node --check backend/server.js` → OK.
- `frontend npm run build` → ✓ built (663 modules, ~3 s).
- `admin-frontend npm run lint` → ✓ zero findings; `npm run build` → ✓ (pre-existing >500 kB chunk advisory only).
- `npm audit fix` intentionally not run.

## 18. Database baseline (read-only verification)
After cleanup: **0** QA users, **0** QA orders/order_items/history rows, **0** QA carts/cart_items, **0** QA wishlist/address rows, **0** QA products (temp ids 52/53 deleted). Product 2 stock restored to exactly 55. Real data untouched: 3 real customers, 3 real orders (pending ×3), revenue **₹10,309**, AOV 3436.33, activity feed contains no QA traces, categories 7, products 14 public + 1 pre-existing hidden.
*(Cleanup method: temporary service-role script run once inside `backend/`, deleted immediately after use; orders explicitly deleted before user because `orders.user_id` is `ON DELETE SET NULL`.)*

## Browser QA
Owner-completed manual smoke test covers interactive flows (storefront home→collections→search→product→cart→wishlist→auth→profile→addresses→checkout→orders→detail→cancel→timeline→invoice; admin dashboard/analytics/settings/products/orders/customers; console cleanliness). Automated equivalents this pass: production builds, dev-server boots (HTTP 200 + root mount), and every underlying API path exercised green.

## Issues / warnings
1. Transient boot-time `JWT issued at future` log line (Supabase clock-skew race) — pre-existing, self-recovers; cosmetic.
2. Pre-existing admin chunk-size build advisory (>500 kB) — cosmetic.
3. Helmet CSP retains legacy-era allowances ('unsafe-inline', cdnjs/fonts) — intentional deferral; tightening remains queued post-Phase-2.
4. Rate-limit buckets left exhausted locally by this suite — restart backend before further local login testing.
5. Production CORS/HSTS behavior **not** verifiable until deployment (documented as deployment steps).

## Final verdict

**SPRINT_22_6_READY_TO_CLOSE**

No commits, pushes, deployments, or Sprint 22.7 work performed.
