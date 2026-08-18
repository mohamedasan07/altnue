import { getSupabase } from '../database/client.js';

/**
 * Wishlist data access (Sprint 22.4 Phase 1).
 *
 * Same conventions as cart.repository.js / address.repository.js: the
 * service-role key is used (bypasses RLS), and every method returns the shared
 * result envelope:
 *   { ok: true,  data }
 *   { ok: false, reason, [code] }
 * so callers never touch Supabase error objects directly. Every query is
 * scoped by user_id so one customer can never read or mutate another
 * customer's rows. `code` carries the Postgres error code (e.g. '23505'
 * unique violation) for the service's idempotent-add mapping.
 */

// wishlist rows joined with the live product snapshot (price, stock, image).
// The wishlist never stores product fields — they are always read from the
// products table, matching the cart module. The nested category join mirrors
// product.repository.js.
const WISHLIST_ITEM_COLUMNS = `
  id,
  user_id,
  product_id,
  created_at,
  product:products (
    id,
    name,
    price,
    old_price,
    image_url,
    stock_quantity,
    is_active,
    category:categories ( name )
  )
`;

// List projection — the same shape but with an INNER join on products
// (product:products!inner). With a plain LEFT JOIN, PostgREST applies an
// embedded filter like product.is_active as part of the JOIN's ON clause, so
// a wishlist row whose product is inactive (or missing) still comes back with
// `product: null` and would be normalized into a ghost "Untitled" item. The
// INNER join drops those rows at the query layer instead — combined with the
// product.is_active filter below, the list returns only wishlist rows whose
// joined product exists and is active. Write/replay lookups keep the LEFT JOIN
// projection so a now-inactive row can still be surfaced where the contract
// needs it (idempotent-add replay).
const ACTIVE_WISHLIST_ITEM_COLUMNS = `
  id,
  user_id,
  product_id,
  created_at,
  product:products!inner (
    id,
    name,
    price,
    old_price,
    image_url,
    stock_quantity,
    is_active,
    category:categories ( name )
  )
`;

/**
 * @param {string} userId  user uuid
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function findAllByUser(userId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('wishlist')
    .select(ACTIVE_WISHLIST_ITEM_COLUMNS)
    .eq('user_id', userId)
    .eq('product.is_active', true)
    .order('created_at', { ascending: false });

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {string} userId     user uuid
 * @param {number} productId  products.id
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function findWishlistItemByUserAndProduct(userId, productId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('wishlist')
    .select(WISHLIST_ITEM_COLUMNS)
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {object} row  DB-ready wishlist row { user_id, product_id }
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function insertWishlistItem(row) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('wishlist')
    .insert(row)
    .select(WISHLIST_ITEM_COLUMNS)
    .single();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Delete a wishlist row. Scoped by BOTH user_id (ownership) and product_id in
 * a single query, so one customer can never touch another customer's row.
 * Idempotent: deleting a row that does not exist returns { ok: true, data: [] }.
 *
 * @param {string} userId     user uuid
 * @param {number} productId  products.id
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function deleteWishlistItemByUserAndProduct(userId, productId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('wishlist')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
    .select('id');

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}
