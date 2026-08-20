import { buildOrderTimeline, formatActor } from '../../utils/orderStatus'
import { formatDateTime } from '../../utils/format'
import classNames from '../../utils/classNames'
import styles from './OrderTimeline.module.css'

/**
 * Truthful order timeline (Sprint 22.5 Phase 5) — built from the real
 * order_status_history rows the backend attaches as `order.history`
 * ({ status, by, at }, oldest first). Every step shows the status label, the
 * actor who performed the transition (System / Customer / Admin) and the
 * actual database timestamp. Nothing is derived or fabricated.
 */
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
            {milestone.actor && (
              <span className={styles.actor}>
                by {formatActor(milestone.actor)}
              </span>
            )}
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