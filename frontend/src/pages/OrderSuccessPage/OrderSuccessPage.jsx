import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { loadOrder } from '../../services/orderStorage';
import { PAYMENT_METHODS } from '../../hooks/useCheckout';
import { formatINR } from '../../utils/format';
import Button from '../../components/ui/Button/Button';
import styles from './OrderSuccessPage.module.css';

const EASE_OUT = [0.22, 1, 0.36, 1];

const Info = ({ label, value }) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={styles.infoValue}>{value}</span>
  </div>
);

/**
 * Post-purchase confirmation. Reads the just-placed order from storage —
 * if absent (fresh visit) it redirects-past the success screen home.
 */
export default function OrderSuccessPage() {
  const [order, setOrder] = useState(() => loadOrder());
  const navigate = useNavigate();

  useEffect(() => {
    if (!loadOrder()) navigate('/collections', { replace: true });
  }, [navigate]);

  const placed = order ? new Date(order.placedAt) : null;
  const paymentLabel = PAYMENT_METHODS.find((method) => method.id === order?.payment)?.label || 'Payment';
  const formatted = placed && !Number.isNaN(placed.getTime())
    ? placed.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  return (
    <motion.section
      className={`page ${styles.section}`}
      aria-labelledby="success-title"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <div className={styles.card}>
        <motion.div
          className={styles.badge}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        <p className="page-kicker">Order confirmed</p>
        <h1 id="success-title" className="page-title">
          You're all set.
        </h1>
<p className={styles.lead}>
            Thanks{order?.shipping?.name ? `, ${order.shipping.name.split(' ')[0]}` : ''} — your
            order is in and a confirmation email is on its way to
            {order?.shipping?.email ? ` ${order.shipping.email}` : ' your inbox'}.
          </p>

        <div className={styles.summary}>
          <Info label="Order number" value={order?.orderNumber} />
          <Info label="Placed at" value={formatted} />
          <Info label="Delivery" value={order?.delivery?.label} />
          <Info label="Arrives by" value={order?.etaDate} />
          <Info label="Payment" value={paymentLabel} />
        </div>

        <div className={styles.total}>
          <span>Total</span>
          <strong>{formatINR(order?.totals?.grandTotal || 0)}</strong>
        </div>

        <div className={styles.actions}>
          <Button to="/collections" variant="primary" size="lg">
            Continue shopping
          </Button>
          <Button to="/wishlist" variant="ghost" size="lg">
            View wishlist
          </Button>
        </div>
      </div>
    </motion.section>
  );
}