import { getSupabase } from '../database/client.js';

/**
 * Order status history data access (Sprint 22.5 Phase 1).
 *
 * Same conventions as cart/order/wishlist repositories: the service-role key
 * is used (bypasses RLS), and every method returns the shared result envelope:
 *   { ok: true,  data }
 *   { ok: false, reason, [code] }
 * so callers never touch Supabase error objects directly. Every query is
 * scoped by order_id so no caller can read or mutate another order's history.
 *
 * The table was created and backfilled by migration 004 (one 'pending'/'system'
 * row per pre-existing order at its placed_at). This module is the read/write
 * foundation Phase 2 builds on — placement, admin status/payment PATCHes and
 * customer cancellation record transitions through orderHistory.service.js.
 */

// History rows carry only the transition facts the timeline UIs render.
const HISTORY_COLUMNS = `
  id,
  order_id,
  status,
  by_role,
  created_at
`;

/**
 * Insert a single history row recording a status/payment transition.
 * @param {{ order_id: string, status: string, by_role: string, created_at?: string }} row
 *   by_role must be one of 'customer' | 'admin' | 'system' (service validates).
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function insertHistoryRow(row) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('order_status_history')
    .insert(row)
    .select(HISTORY_COLUMNS)
    .single();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Read an order's full history timeline, oldest first. Works identically for
 * pre-migration orders (rows backfilled by migration 004) and for orders placed
 * after the migration.
 * @param {string} orderId  order uuid
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function findHistoryByOrder(orderId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('order_status_history')
    .select(HISTORY_COLUMNS)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}