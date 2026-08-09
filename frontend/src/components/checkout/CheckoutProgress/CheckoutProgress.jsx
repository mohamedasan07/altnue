import { motion, useReducedMotion } from 'framer-motion';
import { CHECKOUT_STEPS } from '../../../hooks/useCheckout';
import { cn } from '../../../utils/cn';
import styles from './CheckoutProgress.module.css';

/**
 * 3-step progress rail (Shipping → Payment → Review) with an animated
 * filled track and an accent bar that glides as the shopper advances.
 */
export default function CheckoutProgress({ step }) {
  const reduceMotion = useReducedMotion();
  const progress = Math.min(1, Math.max(0, (step - 1) / 2));

  return (
    <nav className={styles.rail} aria-label="Checkout progress">
      <div className={styles.track} aria-hidden="true">
        <motion.span
          className={styles.fill}
          initial={false}
          animate={{ width: reduceMotion ? '100%' : `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <ol className={styles.steps}>
        {CHECKOUT_STEPS.map((s, index) => {
          const state = s.id === step ? 'current' : s.id < step ? 'done' : 'todo';
          return (
            <li key={s.id} className={styles.stepItem}>
              <div
                className={cn(styles.dot, styles[state])}
                aria-current={state === 'current' ? 'step' : undefined}
                aria-hidden="true"
              >
                {state === 'done' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={cn(styles.label, state === 'current' && styles.labelCurrent)}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}