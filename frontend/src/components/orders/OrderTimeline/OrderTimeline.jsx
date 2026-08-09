import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import styles from './OrderTimeline.module.css';

const STEPS = [
  { key: 'placed', label: 'Placed', sub: 'Order confirmed' },
  { key: 'packed', label: 'Packed', sub: 'Ready for dispatch' },
  { key: 'shipped', label: 'Shipped', sub: 'With the courier' },
  { key: 'delivered', label: 'Delivered', sub: 'Arrived safely' },
];

// How many steps have completed for each order status.
const STATUS_STEP_INDEX = {
  delivered: 4,
  shipped: 3,
  processing: 2,
  placed: 1,
  cancelled: 1,
};

/**
 * Vertical (mobile) / horizontal (desktop) fulfilment timeline.
 * Cancelled orders stop after the first step and show a red marker.
 */
export default function OrderTimeline({ status }) {
  const complete = STATUS_STEP_INDEX[status] ?? 1;
  const cancelled = status === 'cancelled';

  return (
    <ol className={styles.timeline} aria-label={`Order status: ${status ?? 'processing'}`}>
      {STEPS.map(({ key, label, sub }, i) => {
        const done = i < complete;
        const current = i === complete - 1 && !cancelled;
        return (
          <li key={key} className={styles.step}>
            <div className={styles.rail} aria-hidden="true">
              {done ? (
                <motion.span
                  className={cn(styles.dot, styles.dotDone)}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </motion.span>
              ) : cancelled && i === 0 ? (
                <span className={cn(styles.dot, styles.dotCancelled)} aria-hidden="true">
                  ✕
                </span>
              ) : (
                <span
                  className={cn(styles.dot, current && styles.dotCurrent)}
                  aria-hidden="true"
                />
              )}
              {i < STEPS.length - 1 && (
                <span className={cn(styles.line, done && styles.lineDone)} aria-hidden="true" />
              )}
            </div>
            <div className={styles.meta}>
              <p className={cn(styles.label, done && styles.labelDone)}>{label}</p>
              <p className={styles.sub}>{sub}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}