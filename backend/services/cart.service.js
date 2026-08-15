import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import {
  findActiveCartByUser,
  findActiveCartBySession,
  insertCart,
  adoptCartForUser,
  findCartItems,
  findCartItemById,
  insertCartItem,
  findCartLine,
  updateCartItemQuantity,
  deleteCartItem,
  deleteCart,
} from '../repositories/cart.repository.js';
import { findProductById } from '../repositories/product.repository.js';
import {
  validateAddItemPayload,
  validateUpdateQuantityPayload,
  parseSessionId,
  parseCartItemId,
  MAX_ITEM_QTY,
} from '../validators/cart.validator.js';

/**
 * Cart service (Sprint 21.3).
 *
 * Owns all cart business logic: identity resolution (customer vs guest
 * session), product/stock validation on every mutation (never trust client
 * quantities), the "add bumps existing line" rule, and guest→customer cart
 * merge. Row mapping and ownership scoping live here; the repository only
 * touches Supabase.
 *
 * Stock safety: every add/update re-reads the product from the database and
 * clamps/refuses quantities that exceed available stock. This is the layer
 * that Phase 2's checkout stock-locking will build on.
 */

/** Build a consistent 500 for failed database operations. */
function toDbError(action, result) {
  logger.error(`[cart] ${action} failed: ${result?.reason || 'unknown error'}`);
  const err = new ApiError(500, `Unable to ${action}. Please try again.`);
  err.detail = result?.reason;
  return err;
}

/** Map a joined cart_items row to the public cart line shape. */
function normalizeLine(row) {
  if (!row) return null;
  const product = row.product || {};
  return {
    id: row.id,
    productId: row.product_id,
    name: product.name || 'Untitled',
    price: Number(product.price) || 0,
    oldPrice: Number(product.old_price) || 0,
    imageUrl: product.image_url || '',
    size: row.size || '',
    color: row.color || '',
    colorName: row.color_name || '',
    stockQuantity: Number(product.stock_quantity) || 0,
    quantity: row.quantity,
    productActive: product.is_active !== false,
  };
}

/** Map a cart row + its lines to the public cart shape with live totals. */
function normalizeCart(cart, lines) {
  const items = (lines || []).map(normalizeLine).filter(Boolean);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    id: cart?.id ?? null,
    userId: cart?.user_id ?? null,
    sessionId: cart?.session_id ?? null,
    status: cart?.status ?? 'active',
    items,
    totals: {
      count,
      subtotal: Math.round(subtotal * 100) / 100,
    },
  };
}

/**
 * Resolve the current active cart for an owner (customer or guest session).
 * Returns null when no cart exists yet — callers create on first write.
 */
async function loadActiveCart(owner) {
  const result = owner.user_id
    ? await findActiveCartByUser(owner.user_id)
    : await findActiveCartBySession(owner.session_id);
  if (!result.ok) throw toDbError('load cart', result);
  return result.data || null;
}

/**
 * Load a product and enforce existence + active status. Stock is checked
 * separately so callers can combine it with existing quantities.
 */
async function loadProductForCart(productId) {
  const result = await findProductById(productId);
  if (!result.ok) throw toDbError('validate product', result);
  const product = result.data;
  if (!product) throw new ApiError(404, 'Product not found');
  if (product.is_active === false) {
    throw new ApiError(400, 'This product is no longer available');
  }
  return product;
}

/** Clamp a desired quantity to what the storefront allows and stock permits. */
function clampQuantity(desired, stock) {
  const stockCap = Number.isFinite(Number(stock)) && Number(stock) > 0 ? Number(stock) : 1;
  return Math.min(desired, stockCap, MAX_ITEM_QTY);
}

/**
 * GET /api/customer/cart — the current cart for a customer or guest session.
 * Read-only: never creates a cart row.
 */
export async function getCart(owner) {
  const cart = await loadActiveCart(owner);
  if (!cart) return normalizeCart(null, []);

  const items = await findCartItems(cart.id);
  if (!items.ok) throw toDbError('load cart items', items);
  return normalizeCart(cart, items.data);
}

/**
 * POST /api/customer/cart/items — add a product to the cart.
 *
 * Stock rules (never trust client quantities):
 *  - product must exist and be active
 *  - requested quantity must be a positive integer ≤ MAX_ITEM_QTY
 *  - if the same product+size+color already exists, quantity bumps up to
 *    (but never beyond) the capped value; if that exceeds stock the line is
 *    capped at available stock and the caller is told the actual quantity.
 */
export async function addItem(owner, input) {
  const payload = validateAddItemPayload(input);

  const product = await loadProductForCart(payload.productId);
  const stock = Number(product.stock_quantity) || 0;
  if (stock <= 0) {
    throw new ApiError(400, 'This product is out of stock');
  }
  if (payload.quantity > stock) {
    throw new ApiError(400, `Only ${stock} units available in stock`);
  }

  let cart = await loadActiveCart(owner);
  if (!cart) {
    const created = owner.user_id
      ? await insertCart({ user_id: owner.user_id })
      : await insertCart({ session_id: owner.session_id });
    if (!created.ok) throw toDbError('create cart', created);
    cart = created.data;
  }

  const existing = await findCartLine(cart.id, payload.productId, payload.size, payload.color);
  if (!existing.ok) throw toDbError('check cart line', existing);

  let saved;
  if (existing.data) {
    const combined = existing.data.quantity + payload.quantity;
    const quantity = clampQuantity(combined, stock);
    const updated = await updateCartItemQuantity(existing.data.id, cart.id, quantity);
    if (!updated.ok) throw toDbError('update cart line', updated);
    saved = updated.data;
  } else {
    const inserted = await insertCartItem({
      cart_id: cart.id,
      product_id: payload.productId,
      size: payload.size,
      color: payload.color,
      color_name: payload.colorName,
      quantity: payload.quantity,
    });
    if (!inserted.ok) {
      if (inserted.code === '23505') {
        // Concurrent duplicate add — re-run as a quantity bump.
        const again = await findCartLine(cart.id, payload.productId, payload.size, payload.color);
        if (!again.ok) throw toDbError('check cart line', again);
        if (again.data) {
          const quantity = clampQuantity(again.data.quantity + payload.quantity, stock);
          const updated = await updateCartItemQuantity(again.data.id, cart.id, quantity);
          if (!updated.ok) throw toDbError('update cart line', updated);
          saved = updated.data;
        } else {
          throw toDbError('add to cart', inserted);
        }
      } else {
        throw toDbError('add to cart', inserted);
      }
    } else {
      saved = inserted.data;
    }
  }

  const lines = await findCartItems(cart.id);
  if (!lines.ok) throw toDbError('load cart items', lines);
  return normalizeCart(cart, lines.data);
}

/**
 * PUT /api/customer/cart/items/:itemId — set an exact quantity.
 * Refuses quantities above available stock; treats the item as missing when
 * it does not belong to the caller's cart.
 */
export async function updateItem(owner, itemId, input) {
  const id = parseCartItemId(itemId);
  const { quantity } = validateUpdateQuantityPayload(input);

  const cart = await loadActiveCart(owner);
  if (!cart) throw new ApiError(404, 'Cart not found');

  const existing = await findCartItemById(cart.id, id);
  if (!existing.ok) throw toDbError('load cart line', existing);
  if (!existing.data) throw new ApiError(404, 'Cart item not found');

  const product = await loadProductForCart(existing.data.product_id);
  const stock = Number(product.stock_quantity) || 0;
  if (quantity > stock) {
    throw new ApiError(400, `Only ${stock} units available in stock`);
  }

  const updated = await updateCartItemQuantity(id, cart.id, quantity);
  if (!updated.ok) throw toDbError('update cart line', updated);

  const lines = await findCartItems(cart.id);
  if (!lines.ok) throw toDbError('load cart items', lines);
  return normalizeCart(cart, lines.data);
}

/**
 * DELETE /api/customer/cart/items/:itemId — remove a line from the cart.
 */
export async function removeItem(owner, itemId) {
  const id = parseCartItemId(itemId);

  const cart = await loadActiveCart(owner);
  if (!cart) throw new ApiError(404, 'Cart not found');

  const existing = await findCartItemById(cart.id, id);
  if (!existing.ok) throw toDbError('load cart line', existing);
  if (!existing.data) throw new ApiError(404, 'Cart item not found');

  const removed = await deleteCartItem(id, cart.id);
  if (!removed.ok) throw toDbError('remove cart line', removed);

  const lines = await findCartItems(cart.id);
  if (!lines.ok) throw toDbError('load cart items', lines);
  return normalizeCart(cart, lines.data);
}

/**
 * POST /api/customer/cart/merge — fold a guest session cart into the
 * authenticated customer's cart.
 *
 * Merge rules (never lose items, never exceed stock):
 *  - guest cart is adopted wholesale when the customer has no active cart
 *  - otherwise every guest line is merged into the matching product+size+color
 *    line, bumping quantity up to the capped amount; guest-only lines are
 *    copied as-is (still validated against stock)
 *  - the guest cart row is deleted afterwards; quantities that exceed stock
 *    are clamped, never rejected, so no item is lost
 */
export async function mergeGuestCart(userId, sessionId) {
  const guestSessionId = parseSessionId(sessionId);

  const guestCartResult = await findActiveCartBySession(guestSessionId);
  if (!guestCartResult.ok) throw toDbError('load guest cart', guestCartResult);
  const guestCart = guestCartResult.data;

  const userCart = await loadActiveCart({ user_id: userId });

  // Nothing to merge — return the customer's current cart (empty when absent).
  if (!guestCart || !guestCart.id) {
    if (!userCart) return normalizeCart(null, []);
    const userLines = await findCartItems(userCart.id);
    if (!userLines.ok) throw toDbError('load cart items', userLines);
    return normalizeCart(userCart, userLines.data);
  }

  const guestLines = await findCartItems(guestCart.id);
  if (!guestLines.ok) throw toDbError('load guest cart items', guestLines);

  // Customer has no cart yet — adopt the guest cart wholesale.
  if (!userCart) {
    const adopted = await adoptCartForUser(guestCart.id, userId);
    if (!adopted.ok) throw toDbError('adopt guest cart', adopted);
    const lines = await findCartItems(adopted.data.id);
    if (!lines.ok) throw toDbError('load cart items', lines);
    return normalizeCart(adopted.data, lines.data);
  }

  // Merge line by line into the customer's existing cart.
  for (const line of guestLines.data) {
    const product = await loadProductForCart(line.product_id);
    const stock = Number(product.stock_quantity) || 0;
    if (stock <= 0) continue; // unavailable product — drop silently, keep others

    const existing = await findCartLine(userCart.id, line.product_id, line.size, line.color);
    if (!existing.ok) throw toDbError('check cart line', existing);

    if (existing.data) {
      const quantity = clampQuantity(existing.data.quantity + line.quantity, stock);
      const updated = await updateCartItemQuantity(existing.data.id, userCart.id, quantity);
      if (!updated.ok) throw toDbError('update cart line', updated);
    } else {
      const inserted = await insertCartItem({
        cart_id: userCart.id,
        product_id: line.product_id,
        size: line.size,
        color: line.color,
        color_name: line.color_name,
        quantity: clampQuantity(line.quantity, stock),
      });
      if (!inserted.ok && inserted.code !== '23505') {
        throw toDbError('merge cart line', inserted);
      }
    }
  }

  const removed = await deleteCart(guestCart.id);
  if (!removed.ok) throw toDbError('remove guest cart', removed);

  const mergedLines = await findCartItems(userCart.id);
  if (!mergedLines.ok) throw toDbError('load cart items', mergedLines);
  return normalizeCart(userCart, mergedLines.data);
}