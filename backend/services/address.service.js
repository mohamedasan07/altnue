import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import {
  findAllByUser,
  findAddressById,
  insertAddress,
  updateAddressById,
  deleteAddressById,
  clearDefaults,
  promoteFirstDefault,
} from '../repositories/address.repository.js';
import { validateAddressPayload } from '../validators/address.validator.js';

/**
 * Address book service (Sprint 21.2).
 *
 * Owns all address business logic: row → API mapping, ownership checks,
 * and the "exactly one default per user" invariant. The DB enforces the same
 * invariant with a partial unique index (migration 003), so a concurrent
 * set-default race surfaces as a 409 instead of corrupting data.
 *
 * Without native transactions in PostgREST, default promotion follows the
 * established pattern: clear all defaults → set the target → on failure map
 * the unique-violation code to a 409. Compensation for delete/unset promotes
 * the oldest remaining address.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate a UUID path param before it reaches the database. */
function parseAddressId(id) {
  const value = String(id ?? '');
  if (!UUID_RE.test(value)) {
    throw new ApiError(400, 'Invalid address id');
  }
  return value;
}

/** Map a Supabase addresses row to the public API address shape. */
function normalizeAddress(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    country: row.country,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

/** Build a consistent 500 for failed database operations. */
function toDbError(action, result) {
  logger.error(`[addresses] ${action} failed: ${result?.reason || 'unknown error'}`);
  const err = new ApiError(500, `Unable to ${action}. Please try again.`);
  err.detail = result?.reason;
  return err;
}

/** Map a unique-violation on the one-default index to a user-friendly 409. */
function defaultViolation() {
  return new ApiError(409, 'Only one default address is allowed. Please try again.');
}

/**
 * GET /api/customer/addresses — all addresses for the current customer.
 * @param {string} userId
 * @returns {Promise<Array>} normalized addresses, oldest first
 */
export async function listAddresses(userId) {
  const result = await findAllByUser(userId);
  if (!result.ok) throw toDbError('load addresses', result);
  return (result.data || []).map(normalizeAddress);
}

/**
 * POST /api/customer/addresses — create an address. The first address a user
 * saves (or any address flagged isDefault) becomes the default.
 * @param {string} userId
 * @param {object} input
 * @returns {Promise<object>} normalized address
 */
export async function createAddress(userId, input) {
  const payload = validateAddressPayload(input);

  const existing = await findAllByUser(userId);
  if (!existing.ok) throw toDbError('load addresses', existing);
  const hasAddresses = (existing.data || []).length > 0;

  const makeDefault = Boolean(payload.is_default) || !hasAddresses;
  if (makeDefault) {
    const cleared = await clearDefaults(userId);
    if (!cleared.ok) throw toDbError('set default address', cleared);
    payload.is_default = true;
  } else {
    payload.is_default = false;
  }

  const result = await insertAddress({ ...payload, user_id: userId });
  if (!result.ok) {
    if (result.code === '23505') throw defaultViolation();
    throw toDbError('create address', result);
  }

  return normalizeAddress(result.data);
}

/**
 * PUT /api/customer/addresses/:id — update an address, maintaining exactly one
 * default. Passing isDefault: true promotes this address; unsetting the
 * current default promotes the oldest remaining address instead.
 * @param {string} userId
 * @param {string} addressId
 * @param {object} input
 * @returns {Promise<object>} normalized address
 */
export async function updateAddress(userId, addressId, input) {
  const id = parseAddressId(addressId);

  const existingResult = await findAddressById(id, userId);
  if (!existingResult.ok) throw toDbError('load address', existingResult);
  if (!existingResult.data) throw new ApiError(404, 'Address not found');
  const existing = existingResult.data;

  const payload = validateAddressPayload(input);
  delete payload.user_id; // never allow reassigning ownership

  const patch = { ...payload };
  const wantDefault = patch.is_default ?? existing.is_default;

  if (wantDefault && !existing.is_default) {
    const cleared = await clearDefaults(userId);
    if (!cleared.ok) throw toDbError('set default address', cleared);
    patch.is_default = true;
  } else if (!wantDefault) {
    patch.is_default = false;
  }

  const updated = await updateAddressById(id, userId, patch);
  if (!updated.ok) {
    if (updated.code === '23505') throw defaultViolation();
    throw toDbError('update address', updated);
  }

  // Unsetting the default must not leave the user with zero defaults.
  if (!wantDefault && existing.is_default) {
    const promoted = await promoteFirstDefault(userId, id);
    if (!promoted.ok && promoted.code !== '23505') {
      logger.warn(`[addresses] promote default failed after update: ${promoted.reason}`);
    }
  }

  return normalizeAddress(updated.data);
}

/**
 * DELETE /api/customer/addresses/:id — remove an address; when the default is
 * removed, promote the oldest remaining address.
 * @param {string} userId
 * @param {string} addressId
 * @returns {Promise<{ success: true }>}
 */
export async function deleteAddress(userId, addressId) {
  const id = parseAddressId(addressId);

  const existingResult = await findAddressById(id, userId);
  if (!existingResult.ok) throw toDbError('load address', existingResult);
  if (!existingResult.data) throw new ApiError(404, 'Address not found');
  const wasDefault = Boolean(existingResult.data.is_default);

  const removed = await deleteAddressById(id, userId);
  if (!removed.ok) throw toDbError('delete address', removed);

  if (wasDefault) {
    const promoted = await promoteFirstDefault(userId, id);
    if (!promoted.ok && promoted.code !== '23505') {
      logger.warn(`[addresses] promote default failed after delete: ${promoted.reason}`);
    }
  }

  return { success: true };
}
