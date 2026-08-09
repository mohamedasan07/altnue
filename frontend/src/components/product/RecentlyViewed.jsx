import RelatedProducts from './RelatedProducts';

/**
 * "Recently Viewed" — UI only, no backing/persistence in Sprint 6.
 * Renders a deterministic subset of the catalog minus the current product.
 */
export default function RecentlyViewed({ products = [], excludedId, id = 'recently-viewed-title' }) {
  const list = [...products]
    .filter((p) => p.id !== excludedId)
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 4);

  return <RelatedProducts title="Recently Viewed" products={list} id={id} />;
}