import { getSupabase } from '../database/client.js';

/**
 * Cart data access — all reads AND writes go to Supabase (PostgreSQL).
 *
 * Same conventions as address.repository.js: the service-role key is used
 * (bypasses RLS), and every method returns the shared result envelope:
 *   { ok: true,  data }
 *   { ok: false, reason, [code] }
 * so callers never touch Supabase error objects directly. Every query is
 * scoped by cart id so one customer/session can never read or mutate another
 * cart's rows.
 */

// cart_items joined with the live product snapshot (price, stock, image). The
// cart never stores prices — they are always read from the products table so
// stale client quantities/prices are re-derived from the database on every
// read.
const CART_ITEM_COLUMNS = `
  id,
  cart_id,
  product_id,
  size,
  color,
  color_name,
  quantity,
  created_at,
  updated_at,
  product:products (
    id,
    name,
    price,
    old_price,
    image_url,
    stock_quantity,
    is_active
  )
`;

/** Shared cart row projection. */
const CART_COLUMNS = 'id, user_id, session_id, status, created_at, updated_at';

/**
 * @param {string} userId  user uuid
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function findActiveCartByUser(userId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('cart')
    .select(CART_COLUMNS)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {string} sessionId  guest session uuid
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function findActiveCartBySession(sessionId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('cart')
    .select(CART_COLUMNS)
    .eq('session_id', sessionId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Create a cart owned by a user OR a guest session (the DB CHECK enforces
 * that at least one owner is present).
 * @param {{ user_id?: string, session_id?: string }} owner
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function insertCart(owner) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('cart')
    .insert({ ...owner, status: 'active' })
    .select(CART_COLUMNS)
    .single();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Reassign a guest cart to a user during merge — adopt the session cart.
 * @param {string} cartId  cart uuid
 * @param {string} userId  user uuid
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function adoptCartForUser(cartId, userId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('cart')
    .update({ user_id: userId, session_id: null })
    .eq('id', cartId)
    .select(CART_COLUMNS)
    .single();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {string} cartId  cart uuid
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function findCartItems(cartId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('cart_items')
    .select(CART_ITEM_COLUMNS)
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {string} cartId  cart uuid
 * @param {string} itemId  cart_items uuid
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function findCartItemById(cartId, itemId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('cart_items')
    .select(CART_ITEM_COLUMNS)
    .eq('id', itemId)
    .eq('cart_id', cartId)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Add a cart item. The unique (cart_id, product_id, size, color) constraint
 * means a duplicate insert surfaces as code '23505' — the service decides
 * whether to bump quantity instead of erroring.
 * @param {object} row  DB-ready cart_items row
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function insertCartItem(row) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('cart_items')
    .insert(row)
    .select(CART_ITEM_COLUMNS)
    .single();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Find an existing line for a product+size+color in a cart (used to merge
 * duplicate adds into a quantity bump).
 * @param {string} cartId    cart uuid
 * @param {number} productId product id
 * @param {string} size
 * @param {string} color
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function findCartLine(cartId, productId, size, color) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('cart_items')
    .select(CART_ITEM_COLUMNS)
    .eq('cart_id', cartId)
    .eq('product_id', productId)
    .eq('size', size)
    .eq('color', color)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {string} itemId   cart_items uuid
 * @param {string} cartId   cart uuid (ownership guard)
 * @param {number} quantity new quantity
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function updateCartItemQuantity(itemId, cartId, quantity) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', itemId)
    .eq('cart_id', cartId)
    .select(CART_ITEM_COLUMNS)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {string} itemId  cart_items uuid
 * @param {string} cartId  cart uuid (ownership guard)
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function deleteCartItem(itemId, cartId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId)
    .eq('cart_id', cartId)
    .select('id');

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Remove a cart row (order_items cascade is a DB concern; here used to retire
 * the guest cart after a merge).
 * @param {string} cartId  cart uuid
 * @returns {Promise<{ok: boolean, reason?: string, code?: string}>}
 */
export async function deleteCart(cartId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { error } = await supabase.from('cart').delete().eq('id', cartId);
  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data: true };
}