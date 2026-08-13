import { FiMenu, FiSearch, FiBell, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../hooks/useAuth'
import styles from './Topbar.module.css'

function Topbar({ onToggleSidebar }) {
  const { admin, logout } = useAuth()
  const initial = admin?.name?.charAt(0)?.toUpperCase() || 'A'

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
        >
          <FiMenu size={20} />
        </button>

        <div className={styles.search}>
          <FiSearch size={16} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search orders, products, customers…"
          />
        </div>
      </div>

      <div className={styles.right}>
        <button type="button" className={styles.iconButton} aria-label="Notifications">
          <FiBell size={20} />
          <span className={styles.badge} aria-hidden="true" />
        </button>

        <div className={styles.user} title={admin?.email}>
          <div className={styles.avatar}>{initial}</div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{admin?.name || 'Admin'}</span>
            <span className={styles.userRole}>
              {admin?.role || 'Administrator'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.iconButton}
          onClick={logout}
          aria-label="Logout"
          title="Logout"
        >
          <FiLogOut size={20} />
        </button>
      </div>
    </header>
  )
}

export default Topbar
