import classNames from '../../utils/classNames'
import styles from './Card.module.css'

function Card({ title, subtitle, actions, footer, className, children }) {
  return (
    <section className={classNames(styles.card, className)}>
      {(title || actions) && (
        <header className={styles.header}>
          <div className={styles.headerText}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </section>
  )
}

export default Card
