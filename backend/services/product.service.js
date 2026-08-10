import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findAllProducts, findProductById } from '../repositories/product.repository.js';
import { logger } from '../utils/logger.js';

/**
 * Product domain service — Sprint 13B.
 *
 * Reads products from Supabase (via the product repository) and maps database
 * rows back into the exact public API shape the legacy db.json layer produced:
 *
 *   { id, name, description, category, price, oldPrice, imageUrl,
 *     stockQuantity, sale }
 *
 * When Supabase is not configured the service degrades to the legacy db.json
 * snapshot so local development remains usable (same contract the Sprint 13A
 * foundation uses for health checks).
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', 'db.json');

function safeString(v) { return String(v ?? '').trim(); }
function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function loadDbJsonProducts() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    return Array.isArray(parsed?.products) ? parsed.products : [];
  } catch {
    return [];
  }
}

/**
 * Map a Supabase products row to the public API product shape.
 * Accepts either the embedded object form `{ name: 'shirts' }` (from the
 * PostgREST join) or a plain string, mirroring the legacy `category` field.
 */
function normalizeProduct(row) {
  if (!row) return null;

  const category =
    row.category && typeof row.category === 'object' ? row.category?.name : row.category;

  return {
    id: safeNumber(row.id, 0),
    name: safeString(row.name),
    description: safeString(row.description),
    category: safeString(category),
    price: safeNumber(row.price, 0),
    oldPrice: safeNumber(row.old_price, 0),
    imageUrl: safeString(row.image_url || row.image),
    stockQuantity: safeNumber(row.stock_quantity, 0),
    sale: Boolean(row.is_sale),
  };
}

function normalizeLegacy(p) {
  return {
    id: safeNumber(p?.id, 0),
    name: safeString(p?.name),
    description: safeString(p?.description),
    category: safeString(p?.category),
    price: safeNumber(p?.price, 0),
    oldPrice: safeNumber(p?.oldPrice, 0),
    imageUrl: safeString(p?.imageUrl || p?.image),
    stockQuantity: safeNumber(p?.stockQuantity, 0),
    sale: Boolean(p?.sale),
  };
}

export async function listProducts() {
  const result = await findAllProducts();
  if (result.ok) return result.data.map(normalizeProduct);

  // Graceful fallback for unconfigured local dev — identical response shape.
  logger.warn(`Supabase product read failed (${result.reason}) — falling back to db.json`);
  return loadDbJsonProducts().map(normalizeLegacy);
}

export async function getProduct(id) {
  const result = await findProductById(id);
  if (result.ok) return result.data ? normalizeProduct(result.data) : null;

  logger.warn(`Supabase product read failed (${result.reason}) — falling back to db.json`);
  const legacy = loadDbJsonProducts().find((p) => safeNumber(p?.id, 0) === Number(id));
  return legacy ? normalizeLegacy(legacy) : null;
}