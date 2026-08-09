// Deterministic, UI-only rating derived from the product id so the
// storefront reads as populated without inventing backend data.
export function getProductRating(product) {
  const n = Number(product?.id) || 0;
  const value = Math.min(5, Math.max(3.4, 3.6 + ((n * 137) % 13) / 10));
  const count = 8 + (n % 121);
  return { value, count };
}