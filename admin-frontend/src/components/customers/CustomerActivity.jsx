import {
  FiShoppingBag,
  FiEdit3,
  FiMapPin,
  FiUser,
} from 'react-icons/fi'
import classNames from '../../utils/classNames'
import { timeAgo } from '../../utils/format'
import styles from './CustomerActivity.module.css'

/**
 * Read-only activity feed rendered from the customer detail response's
 * activity[] (backend-derived; no extra API calls and no invented events).
 * Visual language mirrors the dashboard activity feed.
 */
const TYPE_MAP = {
  order: { icon: FiShoppingBag, accent: 'order' },
  order_update: { icon: FiEdit3, accent: 'update' },
  address: { icon: FiMapPin, accent: 'address' },
  account: { icon: FiUser, accent: 'account' },
}

function CustomerActivity({ activity }) {
  const items = Array.isArray(activity) ? activity : []

  if (!items.length) {
    return <p className={styles.empty}>No recent activity</p>
  }

  return (
    <ul className={styles.list}>
      {items.map((item, index) => {
        const { icon: Icon, accent } = TYPE_MAP[item.type] || TYPE_MAP.account
        return (
          <li
            key={`${item.type}-${item.time}-${index}`}
            className={styles.item}
          >
            <span className={classNames(styles.marker, styles[accent])}>
              <Icon size={14} aria-hidden="true" />
            </span>

            <div className={styles.content}>
              <span className={styles.title}>{item.title}</span>
              {item.detail && (
                <span className={styles.detail}>{item.detail}</span>
              )}
            </div>

            <time className={styles.time} dateTime={item.time || undefined}>
              {timeAgo(item.time)}
            </time>
          </li>
        )
      })}
    </ul>
  )
}

export default CustomerActivity