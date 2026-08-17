import { getSupabase } from '../database/client.js';
import { USER_SAFE_COLUMNS } from './user.repository.js';
import { ORDER_WITH_ITEMS } from './order.repository.js';

/**
 * Admin customer data access (Sprint 22.3 Phase 1).
 *
 * Admin queries against the same users/addresses/orders tables the customer
 * module uses — no ownership scope (an admin sees every customer). Same
 * conventions as every repository: the service-role key (bypasses RLS) and the
 * shared result envelope
 *   { ok: true,  data, [count] }
 *   { ok: false, reason, [code] }
 * so callers never touch Supabase error objects directly.
 *
 * The list uses PostgREST's range + exact count exactly like adminOrder
 * findAllOrders: the `count` returned is the total of rows matching the filters
 * BEFORE the range is applied, which is what the endpoint exposes as
 * `pagination.total`. The list returns profile fields only (no per-row
 * aggregates) so it is a single bounded query — never an N+1.
 *
 * Addresses are intentionally NOT queried here: the service reuses the existing
 * address repository's findAllByUser (ownership-scoped purely by user_id, so
 * admin-safe as-is).
 */

/** Admin customer projection: the shared safe columns plus the updated_at the
 * admin shape needs (single source of truth stays USER_SAFE_COLUMNS). */
export const CUSTOMER_ADMIN_COLUMNS = `${USER_SAFE_COLUMNS.trim()}, updated_at`;

/** Escape PostgREST filter special characters in free-text search values. */
function escapeFilterValue(value) {
  return value.replace(/([(),.*-])/g, '\\$1');
}

/**
 * GET /api/admin/customers — paginated, filtered, searchable customer list.
 * @param {{
 *   search?: string|null,    // substring match over first_name|last_name|email|phone
 *   isActive?: boolean|null, // active / inactive filter (derived from is_active)
 *   sort?: string,           // allowlisted column: created_at|last_login_at|first_name|email|role
 *   order?: 'asc'|'desc',
 *   offset?: number,
 *   limit?: number,
 * }} options
 * @returns {Promise<{ok: boolean, data?: Array, count?: number, reason?: string, code?: string}>}
 */
export async function findAllCustomers({
  search = null,
  isActive = null,
  sort = 'created_at',
  order = 'desc',
  offset = 0,
  limit = 20,
} = {}) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const build = () => {
    let query = supabase
      .from('users')
      .select(CUSTOMER_ADMIN_COLUMNS, { count: 'exact' })
      .eq('role', 'customer');

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }
    if (search) {
      const term = escapeFilterValue(search);
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`
      );
    }

    return query.order(sort, { ascending: order === 'asc' });
  };

  const { data, error, count } = await build().range(offset, offset + limit - 1);
  if (error) {
    // A page past the last row makes PostgREST reject the range (PGRST103).
    // Fall back to a count-only probe so an overflowing page returns an empty
    // array with the true total instead of a 500.
    if (error.code === 'PGRST103') {
      const probe = await build().range(0, 0);
      if (probe.error) return { ok: false, reason: probe.error.message, code: probe.error.code };
      return { ok: true, data: [], count: probe.count ?? 0 };
    }
    return { ok: false, reason: error.message, code: error.code };
  }
  return { ok: true, data, count };
}

/**
 * GET /api/admin/customers/:id — one customer by id, no ownership scope.
 * @param {string} id  user uuid (already validated by the service)
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function findCustomerById(id) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('users')
    .select(CUSTOMER_ADMIN_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * One scoped query feeding totalOrders / totalSpent / averageOrderValue.
 * Per-user rows are naturally bounded, so this needs no full-table range.
 * @param {string} userId  user uuid
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function fetchCustomerOrderStats(userId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('orders')
    .select('status, grand_total')
    .eq('user_id', userId);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * A customer's orders (with embedded items), newest first, paginated with an
 * exact count. Reuses the exported ORDER_WITH_ITEMS projection so the admin and
 * customer order shapes stay identical.
 * @param {string} userId  user uuid
 * @param {{ offset?: number, limit?: number }} options
 * @returns {Promise<{ok: boolean, data?: Array, count?: number, reason?: string, code?: string}>}
 */
export async function findCustomerOrders(userId, { offset = 0, limit = 10 } = {}) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const build = () =>
    supabase
      .from('orders')
      .select(ORDER_WITH_ITEMS, { count: 'exact' })
      .eq('user_id', userId)
      .order('placed_at', { ascending: false });

  const { data, error, count } = await build().range(offset, offset + limit - 1);
  if (error) {
    // Same overflow guard as findAllCustomers (see above).
    if (error.code === 'PGRST103') {
      const probe = await build().range(0, 0);
      if (probe.error) return { ok: false, reason: probe.error.message, code: probe.error.code };
      return { ok: true, data: [], count: probe.count ?? 0 };
    }
    return { ok: false, reason: error.message, code: error.code };
  }
  return { ok: true, data, count };
}