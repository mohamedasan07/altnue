import { ApiError } from '../utils/apiError.js';

/**
 * Product payload validation.
 *
 * Single source of truth for the fields the Product Management module accepts:
 *   name, description, category, price, oldPrice, stockQuantity, imageUrl,
 *   sale, is_active
 *
 * Used by the controller before it calls the service. Throws ApiError(400)
 * with a combined, human-readable message when the payload is invalid.
 */

const NAME_MAX = 200;
const DESCRIPTION_MAX = 2000;
const CATEGORY_MAX = 100;
const IMAGE_URL_MAX = 2000;

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function toBoolean(value) {
  return value === true || value === 'true';
}

function isValidImageUrl(value) {
  if (typeof value !== 'string') return false;
  if (value.length > IMAGE_URL_MAX) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate a product payload and return a normalized DB-safe object.
 *
 * @param {object} body  request body
 * @param {{ partial?: boolean }} options
 *   partial=false  → create: name, category, price, stockQuantity, imageUrl
 *                   are required.
 *   partial=true   → update: only fields present in the body are validated
 *                   and included in the result.
 * @returns {object} normalized payload (camelCase, DB-ready types)
 * @throws {ApiError} 400 when validation fails
 */
export function validateProductPayload(body = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};

  // --- name ---
  if (isPresent(body.name)) {
    const name = String(body.name).trim();
    if (name.length > NAME_MAX) {
      errors.push('name must be 200 characters or fewer');
    } else {
      data.name = name;
    }
  } else if (!partial) {
    errors.push('name is required');
  }

  // --- description (optional; empty string is accepted) ---
  if (body.description !== undefined && body.description !== null) {
    const description = String(body.description).trim();
    if (description.length > DESCRIPTION_MAX) {
      errors.push('description must be 2000 characters or fewer');
    } else {
      data.description = description || null;
    }
  } else if (!partial && body.description !== undefined) {
    data.description = null;
  }

  // --- category ---
  if (isPresent(body.category)) {
    const category = String(body.category).trim();
    if (category.length > CATEGORY_MAX) {
      errors.push('category must be 100 characters or fewer');
    } else {
      data.category = category;
    }
  } else if (!partial) {
    errors.push('category is required');
  }

  // --- price ---
  if (body.price !== undefined && body.price !== null && body.price !== '') {
    const price = toNumber(body.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.push('price must be a non-negative number');
    } else {
      data.price = price;
    }
  } else if (!partial) {
    errors.push('price is required');
  }

  // --- oldPrice (optional) ---
  if (body.oldPrice !== undefined && body.oldPrice !== null && body.oldPrice !== '') {
    const oldPrice = toNumber(body.oldPrice);
    if (!Number.isFinite(oldPrice) || oldPrice < 0) {
      errors.push('oldPrice must be a non-negative number');
    } else {
      data.oldPrice = oldPrice;
    }
  }

  // --- stockQuantity ---
  if (body.stockQuantity !== undefined && body.stockQuantity !== null && body.stockQuantity !== '') {
    const stock = toNumber(body.stockQuantity);
    if (!Number.isFinite(stock) || !Number.isInteger(stock) || stock < 0) {
      errors.push('stockQuantity must be a non-negative integer');
    } else {
      data.stockQuantity = stock;
    }
  } else if (!partial) {
    errors.push('stockQuantity is required');
  }

  // --- imageUrl ---
  if (isPresent(body.imageUrl)) {
    if (!isValidImageUrl(String(body.imageUrl).trim())) {
      errors.push('imageUrl must be a valid http(s) URL');
    } else {
      data.imageUrl = String(body.imageUrl).trim();
    }
  } else if (!partial) {
    errors.push('imageUrl is required');
  }

  // --- sale (optional boolean) ---
  if (body.sale !== undefined && body.sale !== null) {
    data.sale = toBoolean(body.sale);
  }

  // --- is_active (optional boolean; product status "Hidden" support) ---
  if (body.is_active !== undefined && body.is_active !== null) {
    data.isActive = toBoolean(body.is_active);
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return data;
}
