import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabase } from '../client.js';

/**
 * Sprint 13B — one-time data migration: backend/db.json -> Supabase products.
 *
 * Idempotent: safe to re-run. Existing categories are reused by slug and
 * products are skipped when their slug already exists. Original db.json ids
 * are NOT preserved — the products table uses `bigint generated always as
 * identity`, so new sequential ids are assigned (the public API never depends
 * on absolute id values).
 *
 * Usage:  node database/seed/seed-products.js
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbJsonPath = path.resolve(__dirname, '..', '..', 'db.json');

function loadDbJson() {
  const raw = fs.readFileSync(dbJsonPath, 'utf-8');
  return JSON.parse(raw);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function slugify(value) {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'product';
}

async function ensureCategories(supabase, categoryNames) {
  const { data: existing, error } = await supabase.from('categories').select('id, slug');
  if (error) throw new Error(`Failed to read categories: ${error.message}`);

  const idBySlug = new Map((existing ?? []).map((c) => [c.slug, c.id]));

  for (const name of categoryNames) {
    const slug = slugify(name);
    if (idBySlug.has(slug)) continue;

    const { data: inserted, error: insertError } = await supabase
      .from('categories')
      .insert({ name: String(name).trim(), slug, is_active: true })
      .select('id, slug')
      .single();

    if (insertError) {
      // Unique-violation race (row created concurrently): re-read by slug.
      if (insertError.code === '23505') {
        const { data: again } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        if (again) idBySlug.set(slug, again.id);
        continue;
      }
      throw new Error(`Failed to insert category "${name}": ${insertError.message}`);
    }

    if (inserted) idBySlug.set(slug, inserted.id);
  }

  return idBySlug;
}

async function main() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('[seed-products] Supabase is not configured — set SUPABASE_URL and a service role key in .env');
    process.exit(1);
  }

  const { products } = loadDbJson();

  const categoryNames = [...new Set(
    products.map((p) => String(p?.category ?? '').trim()).filter(Boolean),
  )];
  const categoryIdBySlug = await ensureCategories(supabase, categoryNames);

  const { data: existingProducts } = await supabase.from('products').select('slug');
  const seenSlugs = new Set((existingProducts ?? []).map((p) => p.slug));

  let inserted = 0;
  let skipped = 0;
  const idMap = {};

  for (const product of products) {
    const name = String(product?.name ?? '').trim();
    let slug = slugify(name);
    let suffix = 2;
    while (seenSlugs.has(slug)) {
      slug = `${slugify(name)}-${suffix}`;
      suffix += 1;
    }
    seenSlugs.add(slug);

    const row = {
      category_id: categoryIdBySlug.get(slugify(String(product?.category ?? '').trim())) ?? null,
      name,
      slug,
      description: String(product?.description ?? '').trim() || null,
      price: toNumber(product?.price, 0),
      old_price: product?.oldPrice != null ? toNumber(product?.oldPrice, 0) : null,
      image_url: String(product?.imageUrl ?? '').trim(),
      stock_quantity: toNumber(product?.stockQuantity, 0),
      is_sale: Boolean(product?.sale),
      is_active: true,
      is_new: false,
      rating: 0,
      rating_count: 0,
    };

    const { data: insertedRow, error } = await supabase
      .from('products')
      .insert(row)
      .select('id, slug')
      .single();

    if (error) {
      if (error.code === '23505') {
        skipped += 1; // Slug raced/duplicated on a previous run — safe to skip.
        continue;
      }
      throw new Error(`Failed to insert product "${name}": ${error.message}`);
    }

    idMap[String(product?.id)] = insertedRow.id;
    inserted += 1;
  }

  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });

  console.log(`[seed-products] categories ensured: ${categoryNames.length}`);
  console.log(`[seed-products] products inserted: ${inserted}`);
  console.log(`[seed-products] products skipped (already present): ${skipped}`);
  console.log(`[seed-products] total products in ${''}public.products: ${count}`);
  console.log('[seed-products] old-id -> new-id map:', idMap);
}

main().catch((err) => {
  console.error('[seed-products] failed:', err?.message || err);
  process.exit(1);
});