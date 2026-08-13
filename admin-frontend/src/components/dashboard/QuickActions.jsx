import { Link } from 'react-router-dom'
import { FiArrowUpRight } from 'react-icons/fi'
import { quickActions } from '../../data/dashboard'
import classNames from '../../utils/classNames'
import styles from './QuickActions.module.css'

function QuickActions() {
  return (
    <ul className={styles.grid}>
      {quickActions.map((action) => {
        const Icon = action.icon
        return (
          <li key={action.id}>
            <Link
              to={action.to}
              className={classNames(styles.card, styles[action.accent])}
            >
              <span className={styles.iconWrap}>
                <Icon size={20} aria-hidden="true" />
              </span>

              <span className={styles.meta}>
                <span className={styles.label}>{action.label}</span>
                <span className={styles.description}>
                  {action.description}
                </span>
              </span>

              <FiArrowUpRight
                size={18}
                className={styles.arrow}
                aria-hidden="true"
              />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export default QuickActions
