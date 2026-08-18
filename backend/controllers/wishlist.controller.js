import {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
} from '../services/wishlist.service.js';

/**
 * Wishlist HTTP handlers (Sprint 22.4 Phase 1).
 * Controllers stay thin: read the authenticated customer id from req.user
 * (set by authorize('customer')), delegate to the service, shape the response.
 * Errors thrown by the service (400/404/500) are forwarded to the centralized
 * errorHandler by the asyncHandler wrapper in the route file.
 *
 * Ownership: every call passes req.user.id — a client-supplied user id is
 * never accepted, so one customer can never read or modify another's wishlist.
 */

/** GET /api/customer/wishlist — the current customer's wishlist. */
export async function listWishlistHandler(req, res) {
  const items = await getWishlist(req.user.id);
  res.json({ success: true, items });
}

/** POST /api/customer/wishlist — add a product (idempotent). */
export async function addWishlistItemHandler(req, res) {
  const { item, replayed } = await addWishlistItem(req.user.id, req.body);
  res.status(replayed ? 200 : 201).json({ success: true, item });
}

/** DELETE /api/customer/wishlist/:productId — remove a product (idempotent). */
export async function removeWishlistItemHandler(req, res) {
  const result = await removeWishlistItem(req.user.id, req.params.productId);
  res.json({ success: true });
}
