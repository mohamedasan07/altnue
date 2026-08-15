import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../../hooks/useOrders';
import OrderCard from '../../components/dashboard/OrderCard/OrderCard';
import OrderModal from '../../components/dashboard/OrderModal/OrderModal';
import styles from './OrdersPage.module.css';

/**
 * Orders page — real order history from the customer API, newest first.
 * Opening a card fetches the fresh order detail (GET /api/customer/orders/:id).
 */
export default function OrdersPage() {
  const { orders, status, error, getOrder } = useOrders();
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const handleView = async (order) => {
    setSelected(order);
    setDetail(order);
    try {
      const fresh = await getOrder(order.id);
      setDetail(fresh);
    } catch {
      /* keep the list copy — the modal still renders */
    }
  };

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <motion.section
          className={styles.empty}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="page-kicker">Orders</p>
          <h1 className={styles.title}>Loading your orders…</h1>
        </motion.section>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.page}>
        <motion.section
          className={styles.empty}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="page-kicker">Orders</p>
          <h1 className={styles.title}>Something went wrong.</h1>
          <p className={styles.lead}>{error}</p>
          <Link to="/account" className={styles.cta}>
            Back to dashboard
          </Link>
        </motion.section>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={styles.page}>
        <motion.section
          className={styles.empty}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="page-kicker">Orders</p>
          <h1 className={styles.title}>No orders yet.</h1>
          <p className={styles.lead}>Your placed drops will live here with live tracking.</p>
          <Link to="/collections" className={styles.cta}>
            Continue shopping
          </Link>
        </motion.section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ul className={styles.list} aria-label="Order history">
        <AnimatePresence initial={false}>
          {orders.map((order) => (
            <OrderCard key={order.orderNumber} order={order} onView={handleView} />
          ))}
        </AnimatePresence>
      </ul>

      <OrderModal
        order={detail ?? selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}