import classNames from '../../utils/classNames'
import styles from './SectionCard.module.css'

function SectionCard({
  title,
  subtitle,
  action,
  className,
  children,
  bodyClassName,
}) {
  return (
    <section className={classNames(styles.card, className)}>
      {(title || action) && (
        <header className={styles.header}>
          <div className={styles.headerText}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </header>
      )}
      <div className={classNames(styles.body, bodyClassName)}>{children}</div>
    </section>
  )
}

export default SectionCard
