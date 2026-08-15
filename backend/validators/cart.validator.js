import { ApiError } from '../utils/apiError.js';

/**
 * Cart payload validation (Sprint 21.3).
 *
 * Single source of truth for the fields the cart module accepts, mirroring the
 * storefront's cart business rules (frontend/src/utils/cartConfig.js and
 * ProductPage.jsx): quantities are capped at MAX_ITEM_QTY, and size/color must
 * be one of the values the storefront offers. Throws ApiError(400) with a
 * combined, human-readable message when the payload is invalid.
 *
 * Stock availability is NOT validated here — that requires a product lookup,
 * so the service does it against the database on every mutation (never trust
 * client quantities).
 */

export const MAX_ITEM_QTY = 10;

// Storefront size/color options (ProductPage.jsx + cartConfig.js).
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLOR_NAMES = {
  black: 'Black',
  white: 'Off-White',
  olive: 'Olive',
  rust: 'Rust',
};
const COLORS = Object.keys(COLOR_NAMES);

export const DEFAULT_SIZE = 'M';
export const DEFAULT_COLOR = 'black';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Display name for a color value (falls back to the raw value). */
export function colorNameFor(value) {
  return COLOR_NAMES[value] || value || DEFAULT_COLOR;
}

/** Validate a guest session id (UUID). Returns the trimmed value. */
export function parseSessionId(value) {
  const sessionId = String(value ?? '').trim();
  if (!sessionId) {
    throw new ApiError(400, 'A sessionId is required for guest carts');
  }
  if (!UUID_RE.test(sessionId)) {
    throw new ApiError(400, 'Invalid session id');
  }
  return sessionId;
}

/** Validate a cart item id (UUID) path param before it reaches the database. */
export function parseCartItemId(value) {
  const id = String(value ?? '').trim();
  if (!UUID_RE.test(id)) {
    throw new ApiError(400, 'Invalid cart item id');
  }
  return id;
}

/** Validate a positive, capped quantity. */
function parseQuantity(value, field = 'quantity') {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ApiError(400, `${field} must be a positive integer`);
  }
  if (quantity > MAX_ITEM_QTY) {
    throw new ApiError(400, `${field} cannot exceed ${MAX_ITEM_QTY}`);
  }
  return quantity;
}

/**
 * Validate an "add item" payload and return a normalized object.
 * @param {object} body  request body
 * @returns {{ productId: number, size: string, color: string, colorName: string, quantity: number }}
 * @throws {ApiError} 400 when validation fails
 */
export function validateAddItemPayload(body = {}) {
  const errors = [];
  const data = {};

  // --- productId ---
  const productId = Number(body.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    errors.push('productId must be a positive integer');
  } else {
    data.productId = productId;
  }

  // --- size ---
  const size = String(body.size ?? DEFAULT_SIZE).trim();
  if (!SIZES.includes(size)) {
    errors.push(`size must be one of: ${SIZES.join(', ')}`);
  } else {
    data.size = size;
  }

  // --- color ---
  const color = String(body.color ?? DEFAULT_COLOR).trim();
  if (!COLORS.includes(color)) {
    errors.push(`color must be one of: ${COLORS.join(', ')}`);
  } else {
    data.color = color;
  }

  // --- colorName (optional display label, derived from color when absent) ---
  const colorName = String(body.colorName ?? '').trim();
  data.colorName = colorName || colorNameFor(data.color);

  // --- quantity (optional, defaults to 1) ---
  if (body.quantity === undefined) {
    data.quantity = 1;
  } else {
    try {
      data.quantity = parseQuantity(body.quantity);
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return data;
}

/**
 * Validate an "update quantity" payload.
 * @param {object} body  request body
 * @returns {{ quantity: number }}
 * @throws {ApiError} 400 when validation fails
 */
export function validateUpdateQuantityPayload(body = {}) {
  return { quantity: parseQuantity(body.quantity, 'quantity') };
}
