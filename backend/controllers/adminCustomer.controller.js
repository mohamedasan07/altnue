import {
  listAdminCustomers,
  getAdminCustomer,
  getAdminCustomerWishlist,
} from '../services/adminCustomer.service.js';

/**
 * Admin customer HTTP handlers (Sprint 22.3 Phase 1).
 * Controllers stay thin: parse the request, delegate to the service, shape the
 * response. Errors thrown by the service (400/404/500) are forwarded to the
 * centralized errorHandler by the asyncHandler wrapper in the route file.
 */

/** GET /api/admin/customers — paginated, filtered customer list. */
export async function listCustomersHandler(req, res) {
  const { customers, pagination } = await listAdminCustomers(req.query);
  res.json({ success: true, customers, pagination });
}

/** GET /api/admin/customers/:id — one customer's profile/stats/addresses/orders/activity. */
export async function getCustomerHandler(req, res) {
  const data = await getAdminCustomer(req.params.id, req.query);
  res.json({ success: true, ...data });
}

/** GET /api/admin/customers/:id/wishlist — one customer's saved items (read-only). */
export async function getCustomerWishlistHandler(req, res) {
  const items = await getAdminCustomerWishlist(req.params.id);
  res.json({ success: true, items });
}