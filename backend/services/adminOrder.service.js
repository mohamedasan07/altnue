import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import {
  findAllOrders,
  findOrderByIdAdmin,
  updateOrderStatus,
  updateOrderPaymentStatus,
} from '../repositories/adminOrder.repository.js';
import { parseOrderId } from '../validators/order.validator.js';
import {
  parseAdminOrderQuery,
  validateStatusUpdatePayload,
  validatePaymentStatusUpdatePayload,
} from '../validators/adminOrder.validator.js';
import { normalizeOrder } from './order.service.js';

/**
 * Admin order service (Sprint 22.1 Phases 1–2).
 *
 * Admin order listing, detail, and status/payment updates. Reuses the customer
 * module's normalizeOrder (exported, unmodified) so the admin and customer
 * order shapes are identical, and parseOrderId for the same UUID validation.
 * All query values are allowlisted by parseAdminOrderQuery and all writes are
 * allowlisted by the update validators before they reach the repository.
 * Writes only ever set the two status columns — everything else is untouched.
 */

/** Build a consistent 500 for failed database operations. */
function toDbError(action, result) {
  logger.error(`[admin-orders] ${action} failed: ${result?.reason || 'unknown error'}`);
  const err = new ApiError(500, `Unable to ${action}. Please try again.`);
  err.detail = result?.reason;
  return err;
}

/**
 * Admin-only order projection: the shared customer shape (normalizeOrder) plus
 * the DB timestamps the admin UI needs (created/updated) and the customer
 * response deliberately omits. Keeps normalizeOrder — and therefore the
 * customer order endpoints — completely untouched.
 * @param {object} row  raw order row (with created_at / updated_at columns)
 * @returns {object} normalized order with createdAt / updatedAt
 */
function adminOrderFor(row) {
  return {
    ...normalizeOrder(row),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

/**
 * GET /api/admin/orders — paginated admin order list.
 * @param {object} query  req.query (page, limit, search, status, paymentStatus, sort, order)
 * @returns {Promise<{ orders: Array, pagination: { page, limit, total, totalPages } }>}
 */
export async function listAdminOrders(query = {}) {
  const params = parseAdminOrderQuery(query);
  const offset = (params.page - 1) * params.limit;

  const result = await findAllOrders({
    status: params.status,
    paymentStatus: params.paymentStatus,
    search: params.search,
    sort: params.sort,
    order: params.order,
    offset,
    limit: params.limit,
  });
  if (!result.ok) throw toDbError('load orders', result);

  const orders = (result.data || []).map(adminOrderFor);
  const total = Number(result.count) || 0;

  return {
    orders,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

/**
 * GET /api/admin/orders/:id — a single order with its items.
 * No ownership guard: admins may view every order.
 * @param {string} orderId
 * @returns {Promise<object>} normalized order (with createdAt / updatedAt)
 * @throws {ApiError} 400 invalid id, 404 when not found
 */
export async function getAdminOrder(orderId) {
  const id = parseOrderId(orderId);
  const result = await findOrderByIdAdmin(id);
  if (!result.ok) throw toDbError('load order', result);
  if (!result.data) throw new ApiError(404, 'Order not found');
  return adminOrderFor(result.data);
}

/**
 * PATCH /api/admin/orders/:id/status — update the fulfilment status.
 * @param {string} orderId
 * @param {object} body  { status } (allowlisted by the validator)
 * @returns {Promise<object>} normalized updated order (with createdAt / updatedAt)
 * @throws {ApiError} 400 invalid id or status, 404 when not found
 */
export async function updateAdminOrderStatus(orderId, body) {
  const payload = validateStatusUpdatePayload(body);
  const id = parseOrderId(orderId);
  const result = await updateOrderStatus(id, payload.status);
  if (!result.ok) throw toDbError('update order status', result);
  if (!result.data) throw new ApiError(404, 'Order not found');
  return adminOrderFor(result.data);
}

/**
 * PATCH /api/admin/orders/:id/payment — update the payment status.
 * @param {string} orderId
 * @param {object} body  { paymentStatus } (allowlisted by the validator)
 * @returns {Promise<object>} normalized updated order (with createdAt / updatedAt)
 * @throws {ApiError} 400 invalid id or paymentStatus, 404 when not found
 */
export async function updateAdminOrderPaymentStatus(orderId, body) {
  const payload = validatePaymentStatusUpdatePayload(body);
  const id = parseOrderId(orderId);
  const result = await updateOrderPaymentStatus(id, payload.paymentStatus);
  if (!result.ok) throw toDbError('update order payment status', result);
  if (!result.data) throw new ApiError(404, 'Order not found');
  return adminOrderFor(result.data);
}