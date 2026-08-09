import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { deliveryPriceFor, etaDate } from '../../../hooks/useCheckout';
import styles from './DeliveryOptions.module.css';

const EASE_OUT = [0.22, 1, 0.36, 1];

/**
 * Free/paid delivery choice with price + ETA per option.
 * `etaDays` encoded in the delivery options.
 */
export default function DeliveryOptions({ options, delivery, onChange, subtotal }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Delivery</legend>

      <div className={styles.options}>
        {options.map((option) => {
          const selected = option.id === delivery;
          const fee = deliveryPriceFor(option.id, subtotal);
          return (
            <label key={option.id} className={cn(styles.option, selected && styles.optionSelected)}>
              <input
                type="radio"
                name="delivery"
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
                className={styles.input}
              />
              <span className={styles.radio} aria-hidden="true" />
              <span className={styles.body}>
                <span className={styles.row}>
                  <span className={styles.name}>{option.label}</span>
                  <span className={styles.price}>
                    {fee === 0 ? 'Free' : `₹${fee}`}
                  </span>
                </span>
                <span className={styles.note}>{option.note}</span>
                <motion.span
                  className={styles.eta}
                  initial={false}
                  animate={{ opacity: selected ? 1 : 0.55 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                >
                  Arrives by {etaDate(Date.now(), option.etaDays)}
                </motion.span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}