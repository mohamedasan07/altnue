import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import {
  findAllCustomers,
  findCustomerById,
  fetchCustomerOrderStats,
  findCustomerOrders,
  findWishlistByCustomer,
} from '../repositories/adminCustomer.repository.js';
import { findAllByUser } from '../repositories/address.repository.js';
import {
  parseAdminCustomerQuery,
  parseCustomerOrdersQuery,
  parseCustomerId,
} from '../validators/adminCustomer.validator.js';
import { normalizeCustomer } from './customerAuth.service.js';
import { normalizeOrder } from './order.service.js';
import { normalizeWishlistItem } from './wishlist.service.js';

/**
 * Admin customer service (Sprint 22.3 Phase 1).
 *
 * Admin customer listing + detail. Reuses the customer module's normalizeCustomer
 * and normalizeOrder (both exported, unmodified) plus the address repository's
 * findAllByUser, so the admin and customer shapes stay identical. All query
 * values are allowlisted by parseAdminCustomerQuery / parseCustomerOrdersQuery.
 *
 * The list returns profile fields only — no per-row aggregates — so it is a
 * single bounded query. The detail composes exactly three parallel queries
 * (order stats, addresses, orders+items) and derives the activity feed from
 * those same rows, so it is a constant number of requests — never an N+1.
 */

/** Statuses that never count toward revenue / lifetime spend (mirrors
 * dashboard.service.js so the admin numbers always match the dashboard). */
const EXCLUDED_SALE_STATUSES = ['cancelled', 'refunded'];

const CUSTOMER_ACTIVITY_LIMIT = 10;

/** Build a consistent 500 for failed database operations. */
function toDbError(action, result) {
  logger.error(`[admin-customers] ${action} failed: ${result?.reason || 'unknown error'}`);
  const err = new ApiError(500, `Unable to ${action}. Please try again.`);
  err.detail = result?.reason;
  return err;
}

/**
 * Admin-only customer projection: the shared customer shape (normalizeCustomer)
 * plus the derived status and the DB timestamp the admin UI needs. Keeps
 * normalizeCustomer — and therefore the customer endpoints — untouched.
 * @param {object} row  raw users row (with is_active / updated_at columns)
 * @returns {object} normalized customer with status / updatedAt
 */
function adminCustomerFor(row) {
  return {
    ...normalizeCustomer(row),
    status: row.is_active ? 'active' : 'inactive',
    updatedAt: row.updated_at ?? null,
  };
}

/** Map a Supabase addresses row to the public API address shape (mirrors
 * address.service.js so the admin and customer address shapes stay identical). */
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

/** Admin-only order projection: normalizeOrder plus the timestamps the admin
 * UI needs (mirrors adminOrder.service.js adminOrderFor). */
function orderForAdmin(row) {
  return {
    ...normalizeOrder(row),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

/**
 * Per-customer order statistics from raw order rows.
 * totalSpent excludes cancelled/refunded orders (same definition as the
 * dashboard revenue); AOV guards against 0/0 when there are no sales.
 * @param {Array} orderRows  raw order rows ({ status, grand_total })
 * @returns {{ totalOrders: number, totalSpent: number, averageOrderValue: number }}
 */
function buildCustomerStats(orderRows) {
  const rows = orderRows || [];
  const saleRows = rows.filter((row) => !EXCLUDED_SALE_STATUSES.includes(row.status));
  const totalSpent = Math.round(
    saleRows.reduce((sum, row) => sum + (Number(row.grand_total) || 0), 0) * 100
  ) / 100;
  const averageOrderValue =
    saleRows.length > 0 ? Math.round((totalSpent / saleRows.length) * 100) / 100 : 0;
  return { totalOrders: rows.length, totalSpent, averageOrderValue };
}

/**
 * Derived per-customer activity feed (there is no activity table): built from
 * rows already fetched for the detail — zero extra queries. Shape mirrors the
 * dashboard activity feed ({ type, title, detail, time }), sorted desc, capped.
 * @param {{
 *   profile: object,     // raw users row
 *   orders: Array,       // raw order rows (with placed_at / updated_at)
 *   addresses: Array,    // raw address rows
 * }} input
 * @returns {Array<{ type: string, title: string, detail: string, time: string|null }>}
 */
function buildCustomerActivity({ profile, orders, addresses }) {
  const activity = [];

  for (const order of orders || []) {
    activity.push({
      type: 'order',
      title: 'Order placed',
      detail: `${order.order_number} · ₹${Number(order.grand_total) || 0}`,
      time: order.placed_at || order.created_at || null,
    });
    if (
      order.updated_at &&
      order.placed_at &&
      new Date(order.updated_at).getTime() > new Date(order.placed_at).getTime()
    ) {
      activity.push({
        type: 'order_update',
        title: `Order marked ${order.status}`,
        detail: order.order_number,
        time: order.updated_at,
      });
    }
  }

  for (const address of addresses || []) {
    activity.push({
      type: 'address',
      title: 'Address added',
      detail: `${address.city}, ${address.state}`,
      time: address.created_at || null,
    });
  }

  if (profile?.created_at) {
    activity.push({
      type: 'account',
      title: 'Account created',
      detail: profile.email,
      time: profile.created_at,
    });
  }

  if (profile?.last_login_at) {
    activity.push({
      type: 'account',
      title: 'Last login',
      detail: '',
      time: profile.last_login_at,
    });
  }

  return activity
    .filter((item) => item.time)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, CUSTOMER_ACTIVITY_LIMIT);
}

/**
 * GET /api/admin/customers — paginated admin customer list.
 * @param {object} query  req.query (page, limit, search, status, sort, order)
 * @returns {Promise<{ customers: Array, pagination: { page, limit, total, totalPages } }>}
 */
export async function listAdminCustomers(query = {}) {
  const params = parseAdminCustomerQuery(query);
  const offset = (params.page - 1) * params.limit;

  const result = await findAllCustomers({
    search: params.search,
    isActive: params.isActive,
    sort: params.sort,
    order: params.order,
    offset,
    limit: params.limit,
  });
  if (!result.ok) throw toDbError('load customers', result);

  const customers = (result.data || []).map(adminCustomerFor);
  const total = Number(result.count) || 0;

  return {
    customers,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

/**
 * GET /api/admin/customers/:id — one customer's profile, stats, addresses,
 * orders (paginated) and derived activity. No ownership guard: admins may view
 * every customer.
 * @param {string} id        user uuid
 * @param {object} orderQuery  req.query for the customer's order list (page, limit)
 * @returns {Promise<{
 *   profile: object,
 *   stats: { totalOrders: number, totalSpent: number, averageOrderValue: number },
 *   addresses: Array,
 *   orders: { items: Array, pagination: { page, limit, total, totalPages } },
 *   activity: Array,
 * }>}
 * @throws {ApiError} 400 invalid id, 404 when not found
 */
export async function getAdminCustomer(id, orderQuery = {}) {
  const customerId = parseCustomerId(id);
  const userResult = await findCustomerById(customerId);
  if (!userResult.ok) throw toDbError('load customer', userResult);
  if (!userResult.data) throw new ApiError(404, 'Customer not found');
  const user = userResult.data;

  const orderParams = parseCustomerOrdersQuery(orderQuery);
  const orderOffset = (orderParams.page - 1) * orderParams.limit;

  const [statsResult, addressesResult, ordersResult] = await Promise.all([
    fetchCustomerOrderStats(customerId),
    findAllByUser(customerId),
    findCustomerOrders(customerId, { offset: orderOffset, limit: orderParams.limit }),
  ]);
  if (!statsResult.ok) throw toDbError('load customer stats', statsResult);
  if (!addressesResult.ok) throw toDbError('load customer addresses', addressesResult);
  if (!ordersResult.ok) throw toDbError('load customer orders', ordersResult);

  const addressRows = addressesResult.data || [];
  const orderRows = ordersResult.data || [];
  const totalOrders = Number(ordersResult.count) || 0;

  return {
    profile: adminCustomerFor(user),
    stats: buildCustomerStats(statsResult.data || []),
    addresses: addressRows.map(normalizeAddress),
    orders: {
      items: orderRows.map(orderForAdmin),
      pagination: {
        page: orderParams.page,
        limit: orderParams.limit,
        total: totalOrders,
        totalPages: Math.max(1, Math.ceil(totalOrders / orderParams.limit)),
      },
    },
    activity: buildCustomerActivity({ profile: user, orders: orderRows, addresses: addressRows }),
  };
}

/**
 * GET /api/admin/customers/:id/wishlist — one customer's saved items,
 * read-only. The customer must exist AND have role "customer" (otherwise
 * 404). Unlike the customer wishlist endpoint, inactive products are kept in
 * the response (normalizeWishlistItem marks them isActive:false) so the admin
 * UI can render an unavailable state instead of silently hiding rows.
 *
 * @param {string} id  user uuid (URL path param only — never a body/query)
 * @returns {Promise<Array>} normalized wishlist items (newest first)
 * @throws {ApiError} 400 invalid id, 404 customer not found
 */
export async function getAdminCustomerWishlist(id) {
  const customerId = parseCustomerId(id);

  const userResult = await findCustomerById(customerId);
  if (!userResult.ok) throw toDbError('load customer', userResult);
  if (!userResult.data || userResult.data.role !== 'customer') {
    throw new ApiError(404, 'Customer not found');
  }

  const wishlistResult = await findWishlistByCustomer(customerId);
  if (!wishlistResult.ok) throw toDbError('load customer wishlist', wishlistResult);

  return (wishlistResult.data || []).map(normalizeWishlistItem);
}