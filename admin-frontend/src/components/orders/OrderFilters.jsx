import {
  ORDER_STATUS_FILTERS,
  PAYMENT_STATUS_FILTERS,
} from '../../utils/orderStatus'
import styles from './OrderFilters.module.css'

function OrderFilters({ status, paymentStatus, onStatusChange, onPaymentChange }) {
  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        <span className={styles.label}>Status</span>
        <select
          className={styles.select}
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label="Filter by status"
        >
          {ORDER_STATUS_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Payment</span>
        <select
          className={styles.select}
          value={paymentStatus}
          onChange={(event) => onPaymentChange(event.target.value)}
          aria-label="Filter by payment status"
        >
          {PAYMENT_STATUS_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default OrderFilters