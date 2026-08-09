import { motion, AnimatePresence } from 'framer-motion';
import styles from './QuantitySelector.module.css';

/**
 * Quantity stepper — min/max clamped, keyboard accessible, aria-live value.
 */
export default function QuantitySelector({
  value = 1,
  onChange,
  min = 1,
  max = 10,
  label = 'Quantity',
  disabled = false,
}) {
  const decrease = () => onChange?.(Math.max(min, value - 1));
  const increase = () => onChange?.(Math.min(max, value + 1));

  return (
    <div className={styles.field}>
      <span id="qty-label" className={styles.legend}>
        {label}
      </span>
      <div className={styles.control} aria-labelledby="qty-label">
        <button
          type="button"
          className={styles.btn}
          onClick={decrease}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          −
        </button>
        <span className={styles.value} aria-live="polite" aria-atomic="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              className={styles.valueInner}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.9 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </span>
        <button
          type="button"
          className={styles.btn}
          onClick={increase}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
    </div>
  );
}