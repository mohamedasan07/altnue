import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import styles from './CouponBox.module.css';

const EASE_OUT = [0.22, 1, 0.36, 1];

/**
 * Coupon entry with a distinct active / invalid state.
 * Mirrors the minimal monoline design of the checkout pages.
 */
export default function CouponBox({ coupon, couponInput, onCouponInput, error, onApply, onRemove }) {
  const hasCoupon = Boolean(coupon);

  return (
    <div className={styles.box}>
      {hasCoupon ? (
        <motion.div
          className={styles.applied}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          data-testid="active-coupon"
        >
          <div className={styles.appliedText}>
            <span className={styles.appliedTitle}>{coupon.label}</span>
            <span className={styles.appliedMeta}>
              Code {coupon.code} applied
            </span>
          </div>
          <button type="button" className={styles.removeBtn} onClick={onRemove}>
            <span aria-hidden="true">×</span>
            <span className="visually-hidden">Remove this coupon</span>
          </button>
        </motion.div>
      ) : (
        <motion.form
          className={styles.inputWrap}
          initial={false}
          animate={{ opacity: 1 }}
          onSubmit={(e) => {
            e.preventDefault();
            onApply();
          }}
          role="form"
          aria-label="Apply a coupon or promo code"
        >
          <label htmlFor="couponCode" className={styles.label}>
            Coupon code
          </label>
          <span className={styles.inputRow}>
            <input
              id="couponCode"
              className={cn(styles.input, error && styles.inputError)}
              placeholder="Try WELCOME10"
              value={couponInput}
              onChange={(e) => onCouponInput?.(e.target.value)}
              disabled={hasCoupon}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="couponHint"
            />
            <button type="submit" className={styles.applyBtn} disabled={hasCoupon}>
              Apply
            </button>
          </span>
          <span id="couponHint" className={styles.hint}>
            ~10% off the first order, ~15% off everything
          </span>
          {error && (
            <motion.p className={styles.error} role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {error}
            </motion.p>
          )}
        </motion.form>
      )}
    </div>
  );
}