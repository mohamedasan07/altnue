import { getOrderStatusMeta } from '../../utils/orderStatus'
import classNames from '../../utils/classNames'
import styles from './OrderStatusBadge.module.css'

function OrderStatusBadge({ status }) {
  const meta = getOrderStatusMeta(status)
  return (
    <span className={classNames(styles.badge, styles[meta.accent])}>
      {meta.label}
    </span>
  )
}

export default OrderStatusBadge