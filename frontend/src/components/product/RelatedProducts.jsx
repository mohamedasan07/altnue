import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard/ProductCard';
import Container from '../ui/Container/Container';
import styles from './RelatedProducts.module.css';

/**
 * Reusable product rail: heading + horizontal ProductCard strip.
 */
export default function RelatedProducts({ title = 'Related Products', products = [], viewAllTo, id }) {
  if (!products.length) return null;

  return (
    <section className={styles.section} aria-labelledby={id || 'related-title'}>
      <Container>
        <header className={styles.head}>
          <h2 id={id || 'related-title'} className={styles.title}>
            {title}
          </h2>
          {viewAllTo && (
            <Link to={viewAllTo} className={styles.viewAll}>
              View all
            </Link>
          )}
        </header>

        <div className={styles.grid}>
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}