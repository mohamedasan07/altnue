/**
 * Product status derivation (Sprint 18).
 *
 * The product API exposes `{ stockQuantity, sale, is_active }`. Hidden
 * (is_active = false) products are still listed for admins; the status filter
 * below is derived from the stock/sale fields the Products page groups by:
 *   - "out"    → stockQuantity <= 0            (Out of Stock)
 *   - "sale"   → sale === true && in stock     (On Sale)
 *   - "active" → in stock && not on sale       (Active)
 */

export function deriveProductStatus(product) {
  if (!product) return 'active'
  if (Number(product.stockQuantity) <= 0) return 'out'
  if (product.sale) return 'sale'
  return 'active'
}

export const PRODUCT_STATUS = {
  active: 'Active',
  sale: 'On Sale',
  out: 'Out of Stock',
}

export const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'sale', label: 'On Sale' },
  { value: 'out', label: 'Out of Stock' },
]

/** Humanize a lowercase slug category, e.g. "tshirts" → "Tshirts". */
export function formatCategory(category) {
  return String(category || '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
