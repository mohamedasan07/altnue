import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import {
  insertHistoryRow,
  findHistoryByOrder,
} from '../repositories/orderHistory.repository.js';

/**
 * Order status history service (Sprint 22.5 Phase 1).
 *
 * Owns the order status timeline rules: the allowed `by_role` actors, recording
 * a transition, and mapping DB rows to the public timeline shape
 * ({ status, by, at }). History is the truthful, per-transition record that
 * backs the customer Track Order and admin order timeline UIs.
 *
 * Phase 1 ships the record + read foundation (migration 004 backfilled every
 * existing order with a 'pending'/'system' row at its placed_at). Phase 2
 * records transitions from placement, admin status/payment PATCHes and
 * customer cancellations through the recordOrderHistory primitive here.
 * The repository only touches Supabase.
 */

/** Who may perform a transition. 'system' = automated (placement/backfill). */
export const HISTORY_ROLES = ['customer', 'admin', 'system'];

/** Build a consistent 500 for failed database operations. */
function toDbError(action, result) {
  logger.error(`[orderHistory] ${action} failed: ${result?.reason || 'unknown error'}`);
  const err = new ApiError(500, `Unable to ${action}. Please try again.`);
  err.detail = result?.reason;
  return err;
}

/** Map a history row to the public timeline shape ({ status, by, at }). */
export function normalizeHistoryRow(row) {
  if (!row) return null;
  return {
    status: row.status,
    by: row.by_role,
    at: row.created_at,
  };
}

/**
 * Record a status/payment transition for an order.
 *
 * Pure record primitive — it never changes the order itself; the caller
 * (placement, admin PATCH, customer cancel) performs the transition and then
 * calls this to append the truthful history entry. Idempotent by design at the
 * call site (Phase 2 replay logic), not enforced by a DB constraint.
 *
 * @param {string} orderId  order uuid
 * @param {string} status   the order/payment status at this transition
 * @param {string} byRole   'customer' | 'admin' | 'system'
 * @returns {Promise<object>} normalized timeline row ({ status, by, at })
 * @throws {ApiError} 400 when the role is invalid or required fields are missing
 */
export async function recordOrderHistory(orderId, status, byRole) {
  if (!orderId || !status) {
    throw new ApiError(400, 'orderId and status are required to record history');
  }
  if (!HISTORY_ROLES.includes(byRole)) {
    throw new ApiError(400, 'Invalid history role');
  }

  const inserted = await insertHistoryRow({
    order_id: orderId,
    status,
    by_role: byRole,
  });

  if (!inserted.ok) throw toDbError('record history', inserted);

  return normalizeHistoryRow(inserted.data);
}

/**
 * GET order detail (`/api/customer/orders/:id` and admin detail) — the order's
 * truthful timeline, oldest first. Ownership is enforced by the caller before
 * this is reached; the read is scoped to a single order_id.
 *
 * @param {string} orderId  order uuid
 * @returns {Promise<Array>} normalized timeline [{ status, by, at }]
 */
export async function getOrderHistory(orderId) {
  const result = await findHistoryByOrder(orderId);
  if (!result.ok) throw toDbError('load order history', result);
  return (result.data || []).map(normalizeHistoryRow);
}