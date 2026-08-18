import { ApiError } from '../utils/apiError.js';

/**
 * Wishlist payload validation (Sprint 22.4 Phase 1).
 *
 * Single source of truth for the fields the wishlist module accepts:
 *   POST   /api/customer/wishlist          { productId }
 *   DELETE /api/customer/wishlist/:productId
 *
 * productId is a products.id (bigint), validated the same way as the cart
 * module (cart.validator.js) — a positive integer. The wishlist never accepts
 * a user id from the client: ownership always comes from req.user.id in the
 * service.
 */

/**
 * Validate a product id (bigint) from a path param before it reaches the
 * database.
 * @param {*} value
 * @returns {number} the validated product id
 * @throws {ApiError} 400 when invalid
 */
export function parseProductId(value) {
  const productId = Number(value);
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new ApiError(400, 'Invalid product id');
  }
  return productId;
}

/**
 * Validate an "add to wishlist" payload and return a normalized object.
 * @param {object} body  request body
 * @returns {{ productId: number }}
 * @throws {ApiError} 400 when validation fails
 */
export function validateAddWishlistPayload(body = {}) {
  const errors = [];
  const data = {};

  // --- productId ---
  const productId = Number(body.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    errors.push('productId must be a positive integer');
  } else {
    data.productId = productId;
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return data;
}
