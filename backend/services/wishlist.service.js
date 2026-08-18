import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import {
  findAllByUser,
  findWishlistItemByUserAndProduct,
  insertWishlistItem,
  deleteWishlistItemByUserAndProduct,
} from '../repositories/wishlist.repository.js';
import { findProductById } from '../repositories/product.repository.js';
import {
  validateAddWishlistPayload,
  parseProductId,
} from '../validators/wishlist.validator.js';

/**
 * Wishlist service (Sprint 22.4 Phase 1).
 *
 * Owns all wishlist business logic: ownership scoping (every query is bound to
 * the authenticated user id — never a client-supplied id), product
 * existence/active-status validation (reusing product.repository.js), the
 * idempotent-add rule (the unique (user_id, product_id) constraint turns a
 * duplicate add into a replay of the existing row), and row → API mapping.
 * The repository only touches Supabase.
 */

/** Build a consistent 500 for failed database operations. */
function toDbError(action, result) {
  logger.error(`[wishlist] ${action} failed: ${result?.reason || 'unknown error'}`);
  const err = new ApiError(500, `Unable to ${action}. Please try again.`);
  err.detail = result?.reason;
  return err;
}

/** Map a joined wishlist row to the public wishlist item shape. */
export function normalizeWishlistItem(row) {
  if (!row) return null;
  const product = row.product || {};
  const category =
    product.category && typeof product.category === 'object'
      ? product.category.name
      : product.category;
  return {
    id: row.id,
    productId: row.product_id,
    name: product.name || 'Untitled',
    price: Number(product.price) || 0,
    imageUrl: product.image_url || '',
    category: category || '',
    stockQuantity: Number(product.stock_quantity) || 0,
    isActive: product.is_active !== false,
  };
}

/**
 * GET /api/customer/wishlist — the current customer's saved items, newest
 * first. Only active products are returned, matching the storefront catalog
 * convention (inactive products are never exposed to customers). Rows for
 * products that were later deactivated stay in the DB and drop out of the
 * response; deleted products self-clean via on delete cascade.
 *
 * @param {string} userId  authenticated customer id (req.user.id)
 * @returns {Promise<Array>} normalized wishlist items
 */
export async function getWishlist(userId) {
  const result = await findAllByUser(userId);
  if (!result.ok) throw toDbError('load wishlist', result);
  return (result.data || []).map(normalizeWishlistItem);
}

/**
 * Load a product and enforce existence + active status (same rule as the cart
 * module: not found → 404, inactive → 400). Never trusts client-supplied
 * product fields — every add is validated against the database.
 */
async function loadActiveProduct(productId) {
  const result = await findProductById(productId);
  if (!result.ok) throw toDbError('validate product', result);
  const product = result.data;
  if (!product) throw new ApiError(404, 'Product not found');
  if (product.is_active === false) {
    throw new ApiError(400, 'This product is no longer available');
  }
  return product;
}

/**
 * POST /api/customer/wishlist — add a product to the customer's wishlist.
 *
 * Idempotent: the unique (user_id, product_id) constraint turns a duplicate
 * add into a replay of the existing row — the insert surfaces code '23505'
 * and the service returns the existing item — so no duplicate rows are ever
 * created, even under concurrent adds.
 *
 * @param {string} userId  authenticated customer id (req.user.id)
 * @param {object} input   request body { productId }
 * @returns {Promise<{ item: object|null, replayed: boolean }>}
 */
export async function addWishlistItem(userId, input) {
  const payload = validateAddWishlistPayload(input);

  await loadActiveProduct(payload.productId);

  const inserted = await insertWishlistItem({
    user_id: userId,
    product_id: payload.productId,
  });

  if (!inserted.ok) {
    if (inserted.code === '23505') {
      // Concurrent duplicate add — the winner's row exists; replay it.
      const existing = await findWishlistItemByUserAndProduct(userId, payload.productId);
      if (!existing.ok) throw toDbError('load wishlist item', existing);
      if (existing.data) {
        return { item: normalizeWishlistItem(existing.data), replayed: true };
      }
    }
    throw toDbError('add to wishlist', inserted);
  }

  return { item: normalizeWishlistItem(inserted.data), replayed: false };
}

/**
 * DELETE /api/customer/wishlist/:productId — remove an item.
 *
 * Idempotent: deleting a row that does not exist still succeeds. Scoped by
 * user_id + product_id in one query, so another customer's row can never be
 * touched.
 *
 * @param {string} userId    authenticated customer id (req.user.id)
 * @param {string} productId products.id path param
 * @returns {Promise<{ success: true }>}
 */
export async function removeWishlistItem(userId, productId) {
  const id = parseProductId(productId);

  const removed = await deleteWishlistItemByUserAndProduct(userId, id);
  if (!removed.ok) throw toDbError('remove from wishlist', removed);

  return { success: true };
}
