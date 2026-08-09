import { motion } from 'framer-motion';
import { formatINR } from '../../../utils/format';
import { FREE_SHIPPING_THRESHOLD, shippingProgress, shippingRemaining } from '../../../utils/cartConfig';
import styles from './ShippingProgress.module.css';

/**
 * Free-shipping progress bar with live message.
 * Unlocked → "Congratulations! You unlocked FREE SHIPPING."
 * Locked → "Add ₹X more for FREE SHIPPING."
 */
export default function ShippingProgress({ subtotal = 0 }) {
  const remaining = shippingRemaining(subtotal);
  const unlocked = remaining <= 0;
  const pct = shippingProgress(subtotal);

  return (
    <section className={styles.wrap} aria-label="Free shipping progress">
      <div className={styles.copy}>
        {unlocked ? (
          <p className={styles.congrats}>
            Congratulations!
            <span className={styles.congratsLine}>You unlocked FREE SHIPPING.</span>
          </p>
        ) : (
          <p className={styles.prompt}>
            Add <strong className={styles.amount}>{formatINR(remaining)}</strong> more for
            <strong className={styles.free}> FREE SHIPPING</strong>
          </p>
        )}
      </div>

      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={unlocked ? 'Free shipping unlocked' : `${formatINR(remaining)} away from free shipping`}
      >
        <motion.span
          className={styles.fill}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <p className={styles.goal}>Free shipping over {formatINR(FREE_SHIPPING_THRESHOLD)}</p>
    </section>
  );
}