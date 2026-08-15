import { getSupabase } from '../database/client.js';
import { ORDER_WITH_ITEMS } from './order.repository.js';

/**
 * Admin dashboard data access (Sprint 22.2 Phase 1).
 *
 * Read-only, column-scoped queries that feed the dashboard service. Same
 * conventions as every repository: the service-role key (bypasses RLS) and the
 * shared result envelope
 *   { ok: true,  data, [count] }
 *   { ok: false, reason, [code] }
 * so callers never touch Supabase error objects directly.
 *
 * Aggregation (monthly buckets, best-seller sums, MoM deltas) happens in the
 * service, not here — the repository returns raw rows. PostgREST caps a query
 * at 1000 rows by default, so row-returning reads set an explicit generous
 * range. At the current data volume this is trivially fast; the deferred SQL
 * view in SPRINT_22_2_AUDIT.md §3.4 is the scale path beyond ~100k rows.
 */

// Row-returning reads cover everything up to the audit's deferred scale point.
const FULL_SCAN = [0, 99999];

/**
 * All orders' stats columns — one fetch the service uses to derive revenue,
 * per-status counts and MoM deltas.
 * @returns {Promise<{ok: boolean, data?: Array, count?: number, reason?: string, code?: string}>}
 */
export async function fetchOrderStatsRows() {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error, count } = await supabase
    .from('orders')
    .select('status, grand_total, placed_at', { count: 'exact' })
    .range(...FULL_SCAN);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data, count };
}

/**
 * All products' stats columns — active/hidden/low-stock counts + MoM delta.
 * @returns {Promise<{ok: boolean, data?: Array, count?: number, reason?: string, code?: string}>}
 */
export async function fetchProductStatsRows() {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error, count } = await supabase
    .from('products')
    .select('is_active, stock_quantity, created_at', { count: 'exact' })
    .range(...FULL_SCAN);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data, count };
}

/**
 * Customers' creation timestamps — total + MoM delta for role 'customer'.
 * @returns {Promise<{ok: boolean, data?: Array, count?: number, reason?: string, code?: string}>}
 */
export async function fetchCustomerStatsRows() {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error, count } = await supabase
    .from('users')
    .select('created_at', { count: 'exact' })
    .eq('role', 'customer')
    .range(...FULL_SCAN);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data, count };
}

/**
 * Orders placed on/after `since` (ISO timestamp) — the sales-trend input.
 * @param {string} sinceIso  inclusive lower bound on placed_at
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function fetchSalesRows(sinceIso) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('orders')
    .select('placed_at, grand_total, status')
    .gte('placed_at', sinceIso)
    .range(...FULL_SCAN);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * The N most recent orders with their items embedded (ORDER_WITH_ITEMS).
 * @param {number} limit
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function fetchRecentOrders(limit) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_WITH_ITEMS)
    .order('placed_at', { ascending: false })
    .range(0, limit - 1);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Active products at/below a stock threshold, ascending by stock.
 * @param {number} threshold
 * @param {number} limit
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function fetchLowStockProducts(threshold, limit) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('products')
    .select('id, name, image_url, stock_quantity, category:categories ( name )')
    .eq('is_active', true)
    .lte('stock_quantity', threshold)
    .order('stock_quantity', { ascending: true })
    .range(0, limit - 1);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Ids of orders that count toward sales metrics (status not cancelled/refunded).
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function findSaleOrderIds() {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .not('status', 'in', '(cancelled,refunded)')
    .range(...FULL_SCAN);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data: (data || []).map((row) => row.id) };
}

/**
 * Snapshot lines for the sale orders (best-seller aggregation input).
 * @param {Array<string>} orderIds
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function fetchOrderItemsByOrderIds(orderIds) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, name, quantity')
    .in('order_id', orderIds)
    .range(...FULL_SCAN);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * The N newest customer accounts (role 'customer').
 * @param {number} limit
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function fetchLatestCustomers(limit) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, phone, avatar_url, role, is_active, last_login_at, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range(0, limit - 1);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * The N most recently updated products — feeds "Product updated" activity.
 * @param {number} limit
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function fetchRecentlyUpdatedProducts(limit) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('products')
    .select('id, name, updated_at')
    .order('updated_at', { ascending: false })
    .range(0, limit - 1);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}