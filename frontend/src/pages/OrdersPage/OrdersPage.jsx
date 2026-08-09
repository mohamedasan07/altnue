import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { loadOrders } from '../../services/orderStorage';
import OrderCard from '../../components/dashboard/OrderCard/OrderCard';
import OrderModal from '../../components/dashboard/OrderModal/OrderModal';
import styles from './OrdersPage.module.css';

/**
 * Orders page — full order history from mock localStorage data, newest first.
 */
export default function OrdersPage() {
  const [orders] = useState(() =>
    [...loadOrders()].sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
  );
  const [selected, setSelected] = useState(null);

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
            <OrderCard key={order.orderNumber} order={order} onView={setSelected} />
          ))}
        </AnimatePresence>
      </ul>

      <OrderModal order={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </div>
  );
}