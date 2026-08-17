import { getCustomerStatusMeta } from '../../utils/customerStatus'
import classNames from '../../utils/classNames'
import styles from './CustomerStatusBadge.module.css'

function CustomerStatusBadge({ status }) {
  const meta = getCustomerStatusMeta(status)
  return (
    <span className={classNames(styles.badge, styles[meta.accent])}>
      {meta.label}
    </span>
  )
}

export default CustomerStatusBadge