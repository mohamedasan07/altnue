import { getSupabase } from '../database/client.js';

/**
 * Address data access — all reads AND writes go to Supabase (PostgreSQL).
 *
 * Same conventions as product.repository.js: the service-role key is used
 * (bypasses RLS), and every method returns the shared result envelope:
 *   { ok: true,  data }
 *   { ok: false, reason, [code] }
 * so callers never touch Supabase error objects directly. Every query is
 * scoped by user_id so one customer can never read or mutate another's rows.
 */

const ADDRESS_COLUMNS = `
  id,
  user_id,
  name,
  phone,
  address,
  city,
  state,
  pincode,
  country,
  is_default,
  created_at,
  updated_at
`;

/**
 * @param {string} userId  user uuid
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function findAllByUser(userId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('addresses')
    .select(ADDRESS_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {string} id      address uuid
 * @param {string} userId  owner uuid (ownership guard)
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function findAddressById(id, userId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('addresses')
    .select(ADDRESS_COLUMNS)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {object} row  DB-ready address row (user_id included)
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function insertAddress(row) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('addresses')
    .insert(row)
    .select(ADDRESS_COLUMNS)
    .single();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {string} id      address uuid
 * @param {string} userId  owner uuid (ownership guard)
 * @param {object} patch   partial DB row
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function updateAddressById(id, userId, patch) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('addresses')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select(ADDRESS_COLUMNS)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * @param {string} id      address uuid
 * @param {string} userId  owner uuid (ownership guard)
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string, code?: string}>}
 */
export async function deleteAddressById(id, userId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Unflag every address of a user (used before promoting a new default).
 * @param {string} userId  user uuid
 * @returns {Promise<{ok: boolean, reason?: string, code?: string}>}
 */
export async function clearDefaults(userId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { error } = await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', userId);

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data: true };
}

/**
 * Flag a single address as default (ownership-guarded).
 * @param {string} id      address uuid
 * @param {string} userId  owner uuid
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function setDefaultById(id, userId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select(ADDRESS_COLUMNS)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message, code: error.code };
  return { ok: true, data };
}

/**
 * Promote the oldest remaining address of a user to default. Used after a
 * delete/unset removes the current default, so "exactly one default" is kept.
 * @param {string} userId     user uuid
 * @param {string} excludeId  address uuid to skip (the one just removed)
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string, code?: string}>}
 */
export async function promoteFirstDefault(userId, excludeId) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('addresses')
    .select('id')
    .eq('user_id', userId)
    .neq('id', excludeId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) return { ok: false, reason: error.message, code: error.code };

  const target = data?.[0];
  if (!target) return { ok: true, data: null };
  return setDefaultById(target.id, userId);
}
