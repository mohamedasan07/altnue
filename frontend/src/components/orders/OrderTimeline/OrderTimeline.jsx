import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { ORDER_STATUSES } from '../OrderStatusBadge/OrderStatusBadge';
import styles from './OrderTimeline.module.css';

const labelOf = (status) => ORDER_STATUSES[status]?.label ?? status ?? 'Unknown';

const timestampOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Truthful order timeline (Sprint 22.5 Phase 3) — built from the real
 * order_status_history rows the backend attaches as `order.history`
 * ({ status, by, at }, oldest first). Every step is an actual recorded
 * transition: pre-migration orders carry their backfilled `pending` entry,
 * cancelled orders additionally show the real `cancelled` timestamp. Nothing
 * is derived or fabricated here.
 *
 * When no history is available (defensive fallback) a single step shows only
 * the current state — never an invented timestamp.
 */
export default function OrderTimeline({ history = [], status }) {
  const entries = Array.isArray(history) && history.length > 0 ? history : null;

  if (!entries) {
    const current = status ?? 'pending';
    const cancelled = current === 'cancelled';
    return (
      <ol className={styles.timeline} aria-label={`Order status: ${labelOf(current)}`}>
        <li className={styles.step}>
          <div className={styles.rail} aria-hidden="true">
            {cancelled ? (
              <span className={cn(styles.dot, styles.dotCancelled)}>✕</span>
            ) : (
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
            )}
          </div>
          <div className={styles.meta}>
            <p className={styles.label}>{labelOf(current)}</p>
            <p className={styles.sub} />
          </div>
        </li>
      </ol>
    );
  }

  return (
    <ol className={styles.timeline} aria-label="Order timeline">
      {entries.map((entry, i) => {
        const cancelled = entry.status === 'cancelled';
        const last = i === entries.length - 1;
        return (
          <li key={`${i}-${entry.status}`} className={styles.step}>
            <div className={styles.rail} aria-hidden="true">
              {cancelled ? (
                <span className={cn(styles.dot, styles.dotCancelled)}>✕</span>
              ) : (
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
              )}
              {!last && <span className={styles.line} aria-hidden="true" />}
            </div>
            <div className={styles.meta}>
              <p className={styles.label}>{labelOf(entry.status)}</p>
              <p className={styles.sub}>{timestampOf(entry.at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}