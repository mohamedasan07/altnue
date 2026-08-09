import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Container from '../ui/Container/Container';
import { fadeUp, stagger } from '../../utils/motion';
import styles from './ShopByCategory.module.css';

const CATEGORIES = [
  {
    name: 'Jerseys',
    slug: 'jerseys',
    image: '/images/acmilan.jpeg',
    span: 'wide',
  },
  {
    name: 'T-Shirts',
    slug: 'tshirts',
    image: '/images/tshirt_1.jpeg',
    span: 'wide',
  },
  {
    name: 'Shirts',
    slug: 'shirts',
    image: '/images/shirt_1.jpg',
    span: 'tall',
  },
  {
    name: 'Baggy',
    slug: 'baggy',
    image: '/images/baggy_1.jpg',
    span: 'tall',
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    image: '/images/accessory1_cap.jpeg',
    span: 'wide',
  },
];

export default function ShopByCategory() {
  return (
    <section className={styles.section} aria-labelledby="categories-title">
      <Container>
        <motion.div
          className={styles.head}
          variants={stagger(0.1, 0.12)}
          initial={false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.div variants={fadeUp}>
            <p className={styles.kicker}>Shop</p>
            <h2 id="categories-title" className={styles.title}>
              By category<span className={styles.accent}>.</span>
            </h2>
          </motion.div>
        </motion.div>

        <motion.ul
          className={styles.grid}
          variants={stagger(0.08, 0.1)}
          initial={false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {CATEGORIES.map((category) => (
            <motion.li
              key={category.slug}
              variants={fadeUp}
              className={`${styles.cell} ${styles[category.span]}`}
            >
              <Link
                to={`/collections?category=${category.slug}`}
                className={styles.card}
              >
                <img
                  src={category.image}
                  alt={`${category.name} collection`}
                  className={styles.image}
                  loading="lazy"
                />
                <span className={styles.overlay} aria-hidden="true" />
                <span className={styles.label}>
                  <span className={styles.name}>{category.name}</span>
                  <span className={styles.explore} aria-hidden="true">
                    Explore
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                      strokeLinejoin="round">
                      <path d="M4 12h16" />
                      <path d="M13 5l7 7-7 7" />
                    </svg>
                  </span>
                </span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </section>
  );
}