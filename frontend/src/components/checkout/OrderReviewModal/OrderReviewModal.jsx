import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { formatINR } from '../../../utils/format';
import styles from './OrderReviewModal.module.css';

/**
 * Final confirmation review before the order is placed.
 * Shows verified shipping, delivery, payment + order totals, then calls placeOrder.
 */
export default function OrderReviewModal({ open, onClose, onPlace, data, placing }) {
  const closeRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      const onKey = (e) => e.key === 'Escape' && onClose();
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      closeRef.current?.focus();
      return () => {
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [open, onClose]);

  if (!mounted) return null;

  const shipping = data?.shipping || {};
  const delivery = data?.delivery || {};
  const totals = data?.totals || {};
  const payment = data?.paymentMethods?.find((m) => m.id === data.payment)?.label || (
    data?.paymentLabel || 'Payment'
  );

  const rows = [
    ['Delivery', delivery.label || 'Standard'],
    ['Delivery ETA', data?.etaDate || '—'],
    ['Payment', payment],
    ['Order note', data?.notes ? data.notes : 'None'],
  ];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          onClick={onClose}
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-review-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              ref={closeRef}
              aria-label="Close review"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <path d="M5 5l14 14" />
                <path d="M19 5L5 19" />
              </svg>
            </button>

            <div className={styles.body}>
              <h3 id="order-review-title" className={styles.title}>
                Review order
              </h3>

              <section className={styles.group} aria-label="Shipping address">
                <h4 className={styles.groupTitle}>Shipping</h4>
                <p className={styles.text}>
                  {[shipping.name, shipping.line1, shipping.line2]
                    .filter(Boolean)
                    .join(', ')}
                  <br />
                  {[shipping.city, shipping.state, shipping.pincode, shipping.country]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </section>

              <dl className={styles.rows}>
                {rows.map(([label, value]) => (
                  <div key={label} className={styles.row}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <div className={styles.totalRow}>
                <span>Total ({totals.count} items)</span>
                <strong>{formatINR(totals.grandTotal || 0)}</strong>
              </div>

              <button
                type="button"
                className={styles.place}
                onClick={onPlace}
                disabled={placing}
              >
                {placing ? 'Placing order…' : `Place order · ${formatINR(totals.grandTotal || 0)}`}
              </button>

              <button type="button" className={styles.back} onClick={onClose} disabled={placing}>
                Back to edit
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}