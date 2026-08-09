import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '../ProductCard/ProductCard';
import Container from '../ui/Container/Container';
import { fadeUp, stagger } from '../../utils/motion';
import styles from './NewArrivals.module.css';

export default function NewArrivals({ products = [], status = 'loading' }) {
  const trackRef = useRef(null);

  const arrivals = useMemo(
    () => [...products].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 8),
    [products]
  );

  const scrollByAmount = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.max(track.clientWidth * 0.8, 320);
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <section className={styles.section} aria-labelledby="newarrivals-title">
      <Container>
        <motion.div
          className={styles.head}
          variants={stagger(0.1, 0.12)}
          initial={false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.div variants={fadeUp}>
            <p className={styles.kicker}>Just in</p>
            <h2 id="newarrivals-title" className={styles.title}>
              New arrivals<span className={styles.accent}>.</span>
            </h2>
          </motion.div>

          <motion.div variants={fadeUp} className={styles.controls}>
            <button
              type="button"
              className={styles.control}
              onClick={() => scrollByAmount(-1)}
              aria-label="Scroll new arrivals left"
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.control}
              onClick={() => scrollByAmount(1)}
              aria-label="Scroll new arrivals right"
            >
              ›
            </button>
          </motion.div>
        </motion.div>
      </Container>

      <motion.div
        className={styles.rail}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className={styles.track} ref={trackRef}>
          {status === 'loading'
            ? Array.from({ length: 5 }).map((_, i) => (
                <div className={styles.skeleton} key={i}>
                  <span />
                </div>
              ))
            : arrivals.map((product, index) => (
                <div className={styles.item} key={product.id}>
                  <ProductCard product={product} isNew={index < 3} />
                </div>
              ))}
        </div>
      </motion.div>
    </section>
  );
}