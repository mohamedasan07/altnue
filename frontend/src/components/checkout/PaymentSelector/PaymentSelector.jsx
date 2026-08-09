import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import styles from './PaymentSelector.module.css';

const EASE_OUT = [0.22, 1, 0.36, 1];

/**
 * Payment-method radio list (card / UPI / net banking / COD / Razorpay-paid).
 * A disabled option is shown in a muted state with a "Coming soon" tag.
 */
export default function PaymentSelector({ methods, payment, onChange }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Payment method</legend>

      <div className={styles.options}>
        {methods.map((method) => {
          const selected = method.id === payment;
          const isDisabled = Boolean(method.disabled);
          return (
            <label
              key={method.id}
              className={cn(styles.option, selected && styles.optionSelected, isDisabled && styles.optionDisabled)}
            >
              <input
                type="radio"
                name="payment"
                value={method.id}
                checked={selected}
                disabled={isDisabled}
                onChange={() => onChange(method.id)}
                className={styles.input}
              />
              <span className={styles.radio} aria-hidden="true" />
              <span className={styles.body}>
                <span className={styles.row}>
                  <span className={styles.name}>{method.label}</span>
                  {isDisabled ? (
                    <span className={styles.tag}>Coming soon</span>
                  ) : (
                    <motion.span
                      className={styles.radioHint}
                      initial={false}
                      animate={{ opacity: selected ? 1 : 0 }}
                      transition={{ duration: 0.2, ease: EASE_OUT }}
                    >
                      Selected
                    </motion.span>
                  )}
                </span>
                {method.note && <span className={styles.note}>{method.note}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}