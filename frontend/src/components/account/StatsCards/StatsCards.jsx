import { motion } from 'framer-motion';
import styles from './StatsCards.module.css';

const EASE_OUT = [0.22, 1, 0.36, 1];

/**
 * Header stat tiles — orders placed, wishlist pieces and saved addresses.
 * Animated with a gentle stagger.
 */
export default function StatsCards({ ordersCount = 0, wishlistCount = 0, addressesCount = 0 }) {
  const stats = [
    { label: 'Orders', value: ordersCount },
    { label: 'Wishlist', value: wishlistCount },
    { label: 'Addresses', value: addressesCount },
  ];

  return (
    <motion.dl
      className={styles.grid}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
    >
      {stats.map(({ label, value }) => (
        <motion.div
          key={label}
          className={styles.card}
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
          }}
        >
          <dt className={styles.label}>{label}</dt>
          <dd className={styles.value}>{value}</dd>
        </motion.div>
      ))}
    </motion.dl>
  );
}