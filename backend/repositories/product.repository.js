import { getSupabase } from '../database/client.js';
import { config } from '../config/index.js';

/**
 * Product data access — Sprint 13B: reads now come from Supabase (PostgreSQL).
 * Service-role key is used (bypasses RLS), the same client as the rest of the
 * Sprint 13A foundation.
 */

// `category:categories(name)` returns the joined category name instead of the
// raw `category_id`, keeping the public API shape (`category: "shirts"`).
const PRODUCT_COLUMNS = `
  id,
  name,
  slug,
  description,
  price,
  old_price,
  image_url,
  stock_quantity,
  is_sale,
  is_active,
  category:categories ( name )
`;

/**
 * @returns {Promise<{ok: boolean, data?: Array, reason?: string}>}
 */
export async function findAllProducts() {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('id', { ascending: true });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

/**
 * @param {number|string} id
 * @returns {Promise<{ok: boolean, data?: object|null, reason?: string}>}
 */
export async function findProductById(id) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return { ok: true, data: null };

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('id', numericId)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message };
  return { ok: true, data };
}

/** Exposed for diagnostics if needed. */
export function productStorageConfigured() {
  return config.supabase.configured;
}