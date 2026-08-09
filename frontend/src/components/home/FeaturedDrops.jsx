import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard/ProductCard';
import Container from '../ui/Container/Container';
import { EASE_OUT, fadeUp, stagger } from '../../utils/motion';
import styles from './FeaturedDrops.module.css';

export default function FeaturedDrops({ products = [], status = 'loading' }) {
  const featured = useMemo(() => {
    const onSale = products.filter((p) => p.sale);
    const base = onSale.length >= 4 ? onSale : products;
    return base.slice(0, 4);
  }, [products]);

  return (
    <section className={styles.section} aria-labelledby="featured-title">
      <Container>
        <motion.div
          className={styles.head}
          variants={stagger(0.1, 0.12)}
          initial={false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.div variants={fadeUp}>
            <p className={styles.kicker}>Featured</p>
            <h2 id="featured-title" className={styles.title}>
              This season&apos;s
              <span className={styles.break}>
                {' '}
                DROPS<span className={styles.accent}>.</span>
              </span>
            </h2>
          </motion.div>

          <motion.div variants={fadeUp} className={styles.ctaWrap}>
            <Link to="/collections" className={styles.cta}>
              View Collection
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12h16" />
                <path d="M13 5l7 7-7 7" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className={styles.grid}
          variants={stagger(0.1, 0.1)}
          initial={false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {status === 'loading'
            ? Array.from({ length: 4 }).map((_, i) => (
                <div className={styles.skeleton} key={i}>
                  <span />
                </div>
              ))
            : featured.map((product, i) => (
                <motion.div
                  key={product.id}
                  variants={fadeUp}
                  transition={{ delay: i * 0.02, ease: EASE_OUT }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
        </motion.div>
      </Container>
    </section>
  );
}