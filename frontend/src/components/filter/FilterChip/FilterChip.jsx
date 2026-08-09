import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import styles from './FilterChip.module.css';

/**
 * Category pill with a shared active pill. Framer's layoutId glides the
 * highlight between chips when the active choice moves.
 */
export default function FilterChip({ label, active = false, onClick, className }) {
  return (
    <motion.button
      type="button"
      className={cn(styles.chip, active && styles.chipActive, className)}
      onClick={onClick}
      aria-pressed={active}
      whileTap={{ scale: 0.95 }}
    >
      {active && (
        <motion.span
          className={styles.pill}
          layoutId="filter-chip-pill"
          transition={{ type: 'spring', stiffness: 480, damping: 32 }}
        />
      )}
      <span className={styles.label}>{label}</span>
    </motion.button>
  );
}