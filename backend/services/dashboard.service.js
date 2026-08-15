import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import {
  fetchOrderStatsRows,
  fetchProductStatsRows,
  fetchCustomerStatsRows,
  fetchSalesRows,
  fetchRecentOrders,
  fetchLowStockProducts,
  findSaleOrderIds,
  fetchOrderItemsByOrderIds,
  fetchLatestCustomers,
  fetchRecentlyUpdatedProducts,
} from '../repositories/dashboard.repository.js';
import { normalizeOrder } from './order.service.js';
import { normalizeCustomer } from './customerAuth.service.js';
import {
  parseDashboardQuery,
  DEFAULT_MONTHS,
  DEFAULT_LIMIT,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from '../validators/dashboard.validator.js';

/**
 * Admin dashboard service (Sprint 22.2 Phase 1).
 *
 * All metric math lives here, computed from the repository's raw rows — never
 * duplicated in controllers or routes. The aggregate endpoint (`getDashboard`)
 * composes the same functions the granular endpoints expose, so the numbers on
 * `/api/admin/dashboard` and `/api/admin/dashboard/recent-orders` can never
 * disagree.
 *
 * Revenue excludes cancelled/refunded orders (definitional, per
 * SPRINT_22_2_AUDIT.md §3.2). "Change percent" is month-over-month vs the
 * previous full month, matching the stat cards' "vs last month" hint.
 */

/** Statuses that never count toward revenue or sales. */
const EXCLUDED_SALE_STATUSES = ['cancelled', 'refunded'];

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const RECENT_ACTIVITY_LIMIT = 5;
const RECENT_ACTIVITY_ORDERS = 5;
const RECENT_ACTIVITY_PRODUCTS = 3;
const RECENT_ACTIVITY_LOW_STOCK = 3;

/** Build a consistent 500 for failed database operations. */
function toDbError(action, result) {
  logger.error(`[dashboard] ${action} failed: ${result?.reason || 'unknown error'}`);
  const err = new ApiError(500, `Unable to ${action}. Please try again.`);
  err.detail = result?.reason;
  return err;
}

/** 'YYYY-MM' key for a date — the grouping key for monthly metrics. */
function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 'MMM' label for a 'YYYY-MM' key. */
function monthLabel(key) {
  const monthIndex = Number(key.split('-')[1]) - 1;
  return MONTH_LABELS[monthIndex] ?? key;
}

/** Percentage growth, rounded to 1dp; null when the baseline is zero. */
function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Bucket order rows into monthly totals for the last `months` months,
 * zero-filling months with no orders. Revenue excludes cancelled/refunded.
 * @param {Array} rows  raw order rows ({ placed_at, grand_total, status })
 * @param {number} months
 * @returns {Array<{ month: string, revenue: number, orders: number }>}
 */
function computeSalesOverview(rows, months) {
  const now = new Date();
  const buckets = new Map();

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.set(key, { month: monthLabel(key), revenue: 0, orders: 0 });
  }

  for (const row of rows) {
    const key = monthKey(row.placed_at || row.created_at || Date.now());
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.orders += 1;
    if (!EXCLUDED_SALE_STATUSES.includes(row.status)) {
      bucket.revenue += Number(row.grand_total) || 0;
    }
  }

  return [...buckets.values()].map((b) => ({
    ...b,
    revenue: Math.round(b.revenue * 100) / 100,
  }));
}

/** 'YYYY-MM' key of the current month and the month before it. */
function currentAndPreviousMonths() {
  const now = new Date();
  const current = monthKey(now);
  const previous = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  return { current, previous };
}

/**
 * GET /api/admin/dashboard/stats — stat cards + the last N months of sales.
 * @returns {Promise<{ stats: object, salesOverview: Array }>}
 */
export async function getDashboardStats() {
  const [orders, products, customers] = await Promise.all([
    fetchOrderStatsRows(),
    fetchProductStatsRows(),
    fetchCustomerStatsRows(),
  ]);
  if (!orders.ok) throw toDbError('load dashboard stats', orders);
  if (!products.ok) throw toDbError('load dashboard stats', products);
  if (!customers.ok) throw toDbError('load dashboard stats', customers);

  const orderRows = orders.data || [];
  const productRows = products.data || [];
  const customerRows = customers.data || [];

  const { current, previous } = currentAndPreviousMonths();

  const inMonth = (rows, key, dateOf) =>
    rows.filter((row) => monthKey(dateOf(row)) === key);

  const orderDate = (row) => row.placed_at || row.created_at || Date.now();
  const productDate = (row) => row.created_at || Date.now();
  const customerDate = (row) => row.created_at || Date.now();

  const saleRows = orderRows.filter((row) => !EXCLUDED_SALE_STATUSES.includes(row.status));
  const revenue = (rows) => rows.reduce((sum, row) => sum + (Number(row.grand_total) || 0), 0);

  const thisMonthSales = inMonth(saleRows, current, orderDate);
  const prevMonthSales = inMonth(saleRows, previous, orderDate);

  const totalRevenue = Math.round(revenue(saleRows) * 100) / 100;
  const revenueThisMonth = Math.round(revenue(thisMonthSales) * 100) / 100;
  const revenuePrevMonth = Math.round(revenue(prevMonthSales) * 100) / 100;

  const stats = {
    totalRevenue,
    revenueChangePercent: percentChange(revenueThisMonth, revenuePrevMonth),
    totalOrders: orderRows.length,
    ordersChangePercent: percentChange(
      inMonth(orderRows, current, orderDate).length,
      inMonth(orderRows, previous, orderDate).length
    ),
    totalProducts: productRows.length,
    productsChangePercent: percentChange(
      inMonth(productRows, current, productDate).length,
      inMonth(productRows, previous, productDate).length
    ),
    totalCustomers: customerRows.length,
    customersChangePercent: percentChange(
      inMonth(customerRows, current, customerDate).length,
      inMonth(customerRows, previous, customerDate).length
    ),
    pendingOrders: orderRows.filter((row) => row.status === 'pending').length,
    deliveredOrders: orderRows.filter((row) => row.status === 'delivered').length,
    cancelledOrders: orderRows.filter((row) => row.status === 'cancelled').length,
    activeProducts: productRows.filter((row) => row.is_active === true).length,
    hiddenProducts: productRows.filter((row) => row.is_active === false).length,
    lowStockProducts: productRows.filter(
      (row) => row.is_active === true && (Number(row.stock_quantity) || 0) <= DEFAULT_LOW_STOCK_THRESHOLD
    ).length,
  };

  return { stats, salesOverview: computeSalesOverview(orderRows, DEFAULT_MONTHS) };
}

/**
 * GET /api/admin/dashboard/sales — monthly sales trend.
 * @param {object} query  req.query ({ months })
 * @returns {Promise<{ salesOverview: Array }>}
 */
export async function getSalesOverview(query = {}) {
  const { months } = parseDashboardQuery(query);
  const since = new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1), 1).toISOString();

  const result = await fetchSalesRows(since);
  if (!result.ok) throw toDbError('load sales overview', result);

  return { salesOverview: computeSalesOverview(result.data || [], months) };
}

/**
 * GET /api/admin/dashboard/recent-orders — newest orders with items.
 * @param {object} query  req.query ({ limit })
 * @returns {Promise<{ recentOrders: Array }>}
 */
export async function getRecentOrders(query = {}) {
  const { limit } = parseDashboardQuery(query);
  const result = await fetchRecentOrders(limit);
  if (!result.ok) throw toDbError('load recent orders', result);
  return { recentOrders: (result.data || []).map(normalizeOrder) };
}

/**
 * GET /api/admin/dashboard/low-stock — active products at/below threshold.
 * @param {object} query  req.query ({ threshold, limit })
 * @returns {Promise<{ lowStockProducts: Array }>}
 */
export async function getLowStockProducts(query = {}) {
  const { threshold, limit } = parseDashboardQuery(query);
  const result = await fetchLowStockProducts(threshold, limit);
  if (!result.ok) throw toDbError('load low-stock products', result);

  const lowStockProducts = (result.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category?.name ?? row.category ?? '',
    stock: Number(row.stock_quantity) || 0,
    imageUrl: row.image_url || '',
  }));

  return { lowStockProducts };
}

/**
 * GET /api/admin/dashboard/best-sellers — top products by units sold across
 * non-cancelled/non-refunded orders.
 * @param {object} query  req.query ({ limit })
 * @returns {Promise<{ bestSellers: Array }>}
 */
export async function getBestSellers(query = {}) {
  const { limit } = parseDashboardQuery(query);

  const idsResult = await findSaleOrderIds();
  if (!idsResult.ok) throw toDbError('load best sellers', idsResult);
  const orderIds = idsResult.data || [];
  if (orderIds.length === 0) return { bestSellers: [] };

  const itemsResult = await fetchOrderItemsByOrderIds(orderIds);
  if (!itemsResult.ok) throw toDbError('load best sellers', itemsResult);

  const totals = new Map();
  for (const item of itemsResult.data || []) {
    const current = totals.get(item.product_id) || { name: item.name, quantity: 0 };
    current.quantity += Number(item.quantity) || 0;
    totals.set(item.product_id, current);
  }

  const bestSellers = [...totals.entries()]
    .map(([productId, { name, quantity }]) => ({ productId, name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);

  return { bestSellers };
}

/**
 * GET /api/admin/dashboard/customers — newest customer accounts.
 * @param {object} query  req.query ({ limit })
 * @returns {Promise<{ latestCustomers: Array }>}
 */
export async function getLatestCustomers(query = {}) {
  const { limit } = parseDashboardQuery(query);
  const result = await fetchLatestCustomers(limit);
  if (!result.ok) throw toDbError('load latest customers', result);
  return { latestCustomers: (result.data || []).map(normalizeCustomer) };
}

/**
 * Recent activity — derived from real events (no activity table exists):
 * latest orders placed, latest product updates, low-stock alerts.
 * @returns {Promise<{ recentActivity: Array }>}
 */
export async function getRecentActivity() {
  const [orders, updatedProducts, lowStock] = await Promise.all([
    fetchRecentOrders(RECENT_ACTIVITY_ORDERS),
    fetchRecentlyUpdatedProducts(RECENT_ACTIVITY_PRODUCTS),
    fetchLowStockProducts(DEFAULT_LOW_STOCK_THRESHOLD, RECENT_ACTIVITY_LOW_STOCK),
  ]);
  if (!orders.ok) throw toDbError('load recent activity', orders);
  if (!updatedProducts.ok) throw toDbError('load recent activity', updatedProducts);
  if (!lowStock.ok) throw toDbError('load recent activity', lowStock);

  const activity = [];

  for (const order of orders.data || []) {
    activity.push({
      type: 'order',
      title: 'Customer placed order',
      detail: `${order.order_number} · ${Number(order.grand_total) || 0}`,
      time: order.placed_at || order.created_at || null,
    });
  }

  for (const product of updatedProducts.data || []) {
    activity.push({
      type: 'update',
      title: 'Product updated',
      detail: product.name,
      time: product.updated_at || null,
    });
  }

  for (const product of lowStock.data || []) {
    activity.push({
      type: 'product',
      title: 'Low stock alert',
      detail: `${product.name} — ${Number(product.stock_quantity) || 0} left`,
      time: product.updated_at || null,
    });
  }

  const recentActivity = activity
    .filter((item) => item.time)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, RECENT_ACTIVITY_LIMIT);

  return { recentActivity };
}

/**
 * GET /api/admin/dashboard — the full aggregate payload for the dashboard
 * page, composed from the same functions the granular endpoints expose.
 * @returns {Promise<object>}
 */
export async function getDashboard() {
  const [stats, recentOrders, lowStock, bestSellers, customers, activity] = await Promise.all([
    getDashboardStats(),
    getRecentOrders({ limit: DEFAULT_LIMIT }),
    getLowStockProducts({}),
    getBestSellers({ limit: DEFAULT_LIMIT }),
    getLatestCustomers({ limit: DEFAULT_LIMIT }),
    getRecentActivity(),
  ]);

  return {
    stats: stats.stats,
    salesOverview: stats.salesOverview,
    recentOrders: recentOrders.recentOrders,
    lowStockProducts: lowStock.lowStockProducts,
    bestSellers: bestSellers.bestSellers,
    latestCustomers: customers.latestCustomers,
    recentActivity: activity.recentActivity,
  };
}