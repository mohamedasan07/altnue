import { buildOrderTimeline } from '../../utils/orderStatus'
import { formatDateTime } from '../../utils/format'
import classNames from '../../utils/classNames'
import styles from './OrderTimeline.module.css'

function OrderTimeline({ order }) {
  const milestones = buildOrderTimeline(order)

  return (
    <ol className={styles.timeline}>
      {milestones.map((milestone) => (
        <li
          key={milestone.id}
          className={classNames(
            styles.item,
            styles[milestone.state],
          )}
        >
          <span className={styles.dot} aria-hidden="true" />
          <div className={styles.content}>
            <span className={styles.label}>{milestone.label}</span>
            {milestone.date && (
              <span className={styles.date}>
                {formatDateTime(milestone.date)}
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default OrderTimeline