import { Link } from 'react-router-dom'
import { FiArrowUpRight, FiPlus, FiShoppingBag, FiUsers, FiBarChart2 } from 'react-icons/fi'
import classNames from '../../utils/classNames'
import styles from './QuickActions.module.css'

// Static navigation configuration — not business data. Moved out of
// data/dashboard.js (Sprint 22.2 Phase 2) so the mock file could be deleted.
const quickActions = [
  {
    id: 'add-product',
    label: 'Add Product',
    description: 'Create a new listing',
    to: '/products',
    icon: FiPlus,
    accent: 'primary',
  },
  {
    id: 'orders',
    label: 'View Orders',
    description: 'Manage fulfilment',
    to: '/orders',
    icon: FiShoppingBag,
    accent: 'blue',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Browse your audience',
    to: '/customers',
    icon: FiUsers,
    accent: 'purple',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Explore insights',
    to: '/analytics',
    icon: FiBarChart2,
    accent: 'orange',
  },
]

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
