import classNames from '../../utils/classNames'
import styles from './StatusBreakdownList.module.css'

/**
 * Status breakdown list (Sprint 22.6) — renders a zero-filled status
 * vocabulary ({ value, label, accent, count }) as labelled rows with a
 * share-of-total bar. Shared by the order-status and payment-status cards on
 * the Analytics page; every status is always shown, including zero counts.
 */
function StatusBreakdownList({ items = [] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const share = total > 0 ? Math.round((item.count / total) * 100) : 0
        return (
          <li key={item.value} className={styles.row}>
            <span className={styles.badgeWrap}>
              <span
                className={classNames(styles.badge, styles[item.accent] || styles.info)}
              >
                {item.label}
              </span>
            </span>

            <span className={styles.barTrack} aria-hidden="true">
              <span
                className={classNames(styles.barFill, styles[`fill_${item.accent}`] || styles.fill_info)}
                style={{ width: `${share}%` }}
              />
            </span>

            <span className={styles.count}>
              {item.count}
              <span className={styles.share}>{share}%</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default StatusBreakdownList
