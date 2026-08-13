import { getSupabase } from '../database/client.js';

/**
 * Infrastructure probes used to verify connectivity to Supabase.
 * Internal health checks only — not an HTTP API.
 */
export async function countCategories() {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: 'not-configured' };

  const { count, error } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .limit(1);

  if (error) return { ok: false, reason: error.message };
  return { ok: true, count };
}