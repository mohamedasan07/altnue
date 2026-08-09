import { useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './QuantitySelector.module.css';

/**
 * Cart quantity stepper — min/max clamped, unique labelled id per instance
 * (safe when several are mounted in one list), aria-live value.
 */
export default function QuantitySelector({
  value = 1,
  onChange,
  min = 1,
  max = 10,
  label = 'Quantity',
  compact = false,
}) {
  const labelId = useId();
  const decrease = () => onChange?.(Math.max(min, value - 1));
  const increase = () => onChange?.(Math.min(max, value + 1));

  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.legend}>
        {label}
      </span>
      <div className={`${styles.control} ${compact ? styles.controlCompact : ''}`} aria-labelledby={labelId}>
        <button
          type="button"
          className={styles.btn}
          onClick={decrease}
          disabled={value <= min}
          aria-label={`Decrease quantity`}
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
          disabled={value >= max}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    </div>
  );
}