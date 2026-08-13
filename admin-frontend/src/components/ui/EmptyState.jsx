import classNames from '../../utils/classNames'
import styles from './EmptyState.module.css'

function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}) {
  return (
    <div
      className={classNames(
        styles.emptyState,
        compact && styles.compact,
        className,
      )}
    >
      {icon && <div className={styles.iconWrap}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}

export default EmptyState
