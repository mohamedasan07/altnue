import { getPaymentStatusMeta } from '../../utils/orderStatus'
import classNames from '../../utils/classNames'
import styles from './OrderPaymentBadge.module.css'

function OrderPaymentBadge({ status }) {
  const meta = getPaymentStatusMeta(status)
  return (
    <span className={classNames(styles.badge, styles[meta.accent])}>
      {meta.label}
    </span>
  )
}

export default OrderPaymentBadge