import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import styles from './DashboardCard.module.css';

/**
 * Generic dashboard surface — elevation, optional kicker/title header and a
 * card-level reveal animation.
 */
export default function DashboardCard({ kicker, title, action, className, children }) {
  return (
    <motion.section
      className={cn(styles.card, className)}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {(kicker || title || action) && (
        <header className={styles.header}>
          <div>
            {kicker && <p className={styles.kicker}>{kicker}</p>}
            {title && <h2 className={styles.title}>{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </motion.section>
  );
}