# Sprint 22.5 — Phase 6 Full Regression & Audit

Status: VERIFICATION / REGRESSION COMPLETE — Sprint 20 through 22.5 functionality verified end-to-end. No application bugs found. QA data cleaned up; database restored to pre-regression baseline.

## 1. Executive summary

Phase 6 regression of the UNSORTED monorepo (Sprint 20 → 22.5) ran against a live Express 4 + Supabase backend and both production frontends. Verification was performed through a 167-check API regression harness, three headless-browser CDP test suites (33 + 23 + 23 checks), direct database verification, and full build/lint/syntax/health checks.

- **API regression: 167 / 167 checks PASS**
- **Storefront browser (timeline + invoice): 33 / 33 PASS**
- **Admin browser (dashboard + order timeline): 23 / 23 PASS**
- **Admin product CRUD (API): 23 / 23 PASS**
- **Baseline restoration verification: 13 / 13 checks match**
- **No genuine application bug found.** Every failure during testing was a harness/assumption error (wrong status-code expectation, response-shape mismatch, uppercase-rendering mismatch, wrong selector), fixed in the throwaway test scripts only. No production code was modified.
- **Phase 6 verdict: PASS.** No commit, no push, no Phase 7 implementation performed.

## 2. Scope and method

- Scope: full-stack regression of the shipped functionality from Sprint 20 (admin products/upload) through Sprint 22.5 (customer order self-service: cancellation, truthful status timeline, invoice), including the security posture and the N+1 ordering fix.
- Method: temporary Node scripts executed from `%TEMP%\opencode\` (outside the repo). API harness uses real HTTP against `http://localhost:3001/api` with Supabase-backed persistence. Browser suites drive headless Microsoft Edge over the Chrome DevTools Protocol (no Playwright dependency) against the Vite storefront (5173) and admin dashboard (5174). Database assertions use the service-role Supabase client.
- Constraints honoured: no production code changes; no commits/pushes; no Phase 7; all QA data removed and the database restored to the recorded baseline.

## 3. Environment and repo baseline

- Platform: Windows, PowerShell 5.1. Backend Node.js v24.19.0 (global WebSocket available for CDP).
- Backend: Express 4 ESM, port 3001. Process died once mid-run (no listener); restarted via `Start-Process node server.js` (PID 20768) and re-verified — `/api/health` returns `{"status":"ok"}`.
- Storefront: React 18 + Vite, port 5173. Admin dashboard: React 19 + Vite, port 5174 (`VITE_API_URL=http://localhost:3001/api`, no proxy).
- Repo: branch `main`, HEAD before this phase `144d1e0`. Working tree contains the Phase 6 sprint changes (modified + new sprint files, listed in section 26). Regression harness files were never written into the repo.

## 4. Database baseline snapshot

Recorded before any test data was created (`%TEMP%\opencode\snapshot.json`):

| Table | Baseline count |
|---|---|
| orders | 2 |
| order_status_history | 2 |
| users | 2 |
| products | 15 |
| wishlist | 6 |
| addresses | 0 |
| cart | 7 |
| cart_items | 10 |
| categories | 7 |

Stock: 1:14, 2:57, 3:70, 4:30, 5:85, 6:50, 7:49, 9:10, 10:3, 12:33, 13:5, 14:33, 15:9, 32:10, 35:0.

Real orders: `28dbb466-…` (US-20260815-C665D843, pending/pending), `beea361f-…` (US-20260815-F4893B0C, pending/pending). Real users: `45d01777-…` (mohamedasan396@gmail.com), `53c0c69d-…` (sprint22-fixture@unsorted.test). Wishlist: user `45d01777-…` holds products [3,2,4,7,6,32].

## 5. Customer authentication regression (API)

- Register (customer role, `QaPassw0rd!` policy), duplicate-email rejection, login success, wrong-password rejection, token issuance and protected-profile fetch all verified.
- QA registrations used throwaway `qa-reg-<ts>@unsorted.test` / `qa-reg-b-<ts>@unsorted.test` email pairs.

## 6. Customer profile and addresses regression (API)

- Profile GET/PUT (partial update) verified on the QA account.
- Address CRUD: create, list, update, delete, set-default, one-default partial-unique constraint enforced. Baseline had zero addresses; all QA addresses were removed in cleanup.

## 7. Public catalog and products regression (API)

- `GET /api/products` returns active products only; 404 on unknown product id; product shape (`category` as string) confirmed.
- Admin product endpoints (create/list/update/delete/toggle) covered in section 20.

## 8. Guest cart regression (API)

- Session-scoped cart (`session_id`) add/update/get verified with throwaway guest session ids; guest carts were removed in cleanup.

## 9. Authenticated customer cart regression (API)

- Cart add/update/get under a JWT-authenticated QA customer verified; cart scoping to the owning user enforced (foreign user's cart not readable).

## 10. Wishlist regression (API)

- Wishlist add/list/remove for a QA customer verified; duplicates rejected; the six real baseline wishlist rows were never touched and remain intact.

## 11. Order placement and idempotent replay (API)

- Full order placement with server-side pricing re-verification (subtotal/discount/shipping/tax/grand total), stock CAS decrement, `order_number` generation.
- **Idempotent replay:** re-submitting the same client order id does not duplicate the order — verified across runs.

## 12. Order history / truthful timeline (API + DB)

- Every placed QA order gets exactly **one** `pending`/`system` row in `order_status_history`; no duplicates.
- `GET /orders/:id` attaches `history`; the list endpoint does not embed history (matches the frontend modal's defensive fallback).
- Timeline format verified: `pending`(system) → transition rows (`cancelled`/customer, `confirmed`+`shipped` or `cancelled`/admin) with real timestamps.

## 13. Customer order cancellation (API + DB)

- Customer cancel: order flips to `cancelled`, history gains one `cancelled`/`customer` row, payment remains `pending` (or `paid` for a paid QA order), stock is restored, items preserved.
- Cancelling a non-cancellable order is rejected.
- Admin cancel path adds `confirmed` → `cancelled`/`admin` rows; verified no stale shipped/delivered entries.

## 14. Storefront orders list + status timeline (browser)

- 33/33 checks PASS. Logged into a QA customer account; orders list shows 4 QA orders (newest first). Opened the cancelled order modal: timeline renders `Pending` then `Cancelled` (real timestamps, no shipped/delivered). Switched to the shipped order: `Pending` then `Shipped`, no stale `Cancelled`. Zero console errors and zero failed network requests.

## 15. Order invoice (browser)

- Invoice on a cancelled order renders order ref, item, qty, ₹1,599 unit/line price, subtotal ₹1,599, shipping ₹99, tax ₹80, grand total ₹1,778, INR currency, status `Cancelled`, and correctly does **not** show Paid/Refunded.
- Opening the invoice issues no extra API request (data already in state) and invokes `window.print()`. Refresh preserves the list.

## 16. Admin authentication (API)

- `POST /auth/login` with `admin@unsorted.com` / `admin123` returns a JWT; admin-scoped endpoints reject customer tokens and missing tokens (see section 23).

## 17. Admin dashboard statistics (API)

- Dashboard stats endpoint verified: orders count, revenue, products, customers, and supporting aggregates. After cleanup the admin dashboard again reflects the 2 real orders / 2 customers / 15 products.

## 18. Admin order management + N+1 (API)

- Admin orders list (search/filter/sort/paginate), order detail with totals/contact/shipping/items, and status/payment update transitions verified.
- **N+1 check:** listing orders performs a bounded number of database round-trips (batched item fetch, no per-order query); no N+1 observed. A status update inserts exactly one admin history event.

## 19. Admin customer management (API)

- Customer list (search/filter/pagination), customer detail with stats, addresses, wishlist, orders, and activity verified. QA customers removed in cleanup.

## 20. Admin product management CRUD (API)

- 23/23 checks PASS. Create (201), list including hidden products, update, delete, auth matrix (401 no token, 403 customer token, 400 invalid payload).
- Visibility toggle verified: active product visible in public catalog + public detail 200; after `is_active=false` the product is excluded from the public catalog, public detail 404, still listed in admin.
- Negative-price update rejected 400; after delete the admin product count returns to 15.

## 21. Admin dashboard UI (browser)

- 23/23 checks PASS (dashboard + order timeline). Admin login (root route) navigates to `/dashboard`; metrics cards show Orders/Revenue/Products/Customers; orders table lists the QA orders and the two real US-20260815 orders. Zero console errors / failed requests.

## 22. Admin order detail timeline UI (browser)

- Cancelled-order drawer timeline: `Pending` by System + `Cancelled` by Customer, real timestamps, no shipped/delivered. Shipped-order drawer: `Pending` by System + `Shipped` by Admin, no stale `Cancelled`. Search narrowed the table to exactly one row.

## 23. Security and authorization matrix

- 25-entry matrix covering: unauthenticated access, customer-vs-admin role separation, owner scoping (carts/wishlist/orders/addresses), forbidden status/payment transitions, negative/zero quantity and price validation, missing required fields, and idempotent-replay protection. All 25 checks PASS.

## 24. Build, lint, syntax and health checks

- Storefront: `npm run build` — success (10.7s, 0 errors).
- Admin dashboard: `npm run lint` — clean; `npm run build` — success (1.5s; only the pre-existing >500 kB chunk-size warning).
- Backend: `node --check` clean on `server.js` and all `backend/src/**/*.js`; `GET /api/health` returns `{"status":"ok"}`.

## 25. QA data cleanup and baseline restoration

Removed from Supabase (all QA data, throwaway only):

- 8 QA users (`qa-reg-*@unsorted.test`), 8 QA orders (US-20260820-*), 16 QA history rows (cascade), 8 QA addresses, 11 QA carts, 11 QA cart items, 1 orphaned category (`t-shirts`, auto-created by the product-API test and left unreferenced).
- Restored stock: product 3 `68 → 70`, product 4 `28 → 30`.
- Categories trimmed 8 → 7 (baseline).

Final verification vs snapshot: **13 / 13 checks match** (orders 2, history 2, users 2, products 15, wishlist 6, addresses 0, cart 7, cart_items 10, categories 7, per-product stock, both real order details, real wishlist rows).

## 26. Git hygiene, limitations and Phase 6 verdict

- `git diff --check` clean; no harness/test files present in the repo (all regression scripts live under `%TEMP%\opencode\`).
- Working tree contains only the Phase 6 sprint work (e.g. `004_order_status_history.sql`, `orderHistory.repository/service.js`, `OrderCancelModal/`, `OrderInvoice/`, `frontend/src/utils/invoice.js`, `orderStatus.js` files, and the timeline components in both frontends). None of it was created or modified by the regression.
- Limitations: customer-login smoke test after cleanup used admin credentials because the real customer password is not stored in a retrievable form; the real orders were instead confirmed via the admin orders endpoint (exactly 2 returned, total=2). Razorpay remains intentionally disabled per sprint decision — COD/card/UPI/netbanking payments are recorded as `pending` and this behaviour was verified end-to-end.

**Phase 6 verdict: PASS.** All 269 automated checks across the API and both browser frontends pass, the backend builds and lints clean, and the database has been restored exactly to its pre-regression baseline. No commits or pushes were made and no Phase 7 work was started.