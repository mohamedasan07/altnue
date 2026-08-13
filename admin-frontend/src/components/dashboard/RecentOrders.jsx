import { recentOrders } from '../../data/dashboard'
import classNames from '../../utils/classNames'
import styles from './RecentOrders.module.css'

const STATUS_ACCENTS = {
  Pending: 'warning',
  Processing: 'info',
  Delivered: 'success',
  Cancelled: 'danger',
}

function RecentOrders() {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Order ID</th>
            <th scope="col">Customer</th>
            <th scope="col">Amount</th>
            <th scope="col">Status</th>
            <th scope="col">Date</th>
          </tr>
        </thead>
        <tbody>
          {recentOrders.map((order) => (
            <tr key={order.id}>
              <td className={styles.orderId}>{order.id}</td>
              <td className={styles.customer}>{order.customer}</td>
              <td className={styles.amount}>{order.amount}</td>
              <td>
                <span
                  className={classNames(
                    styles.badge,
                    styles[STATUS_ACCENTS[order.status] || 'info'],
                  )}
                >
                  {order.status}
                </span>
              </td>
              <td className={styles.date}>{order.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default RecentOrders
