import Loader from './ui/Loader'
import styles from './SessionLoading.module.css'

/**
 * Full-screen loading state shown while the stored JWT is being validated
 * against the backend on startup. Rendered instead of ALL routes so the admin
 * shell can never appear before authentication is confirmed.
 */
function SessionLoading() {
  return (
    <div className={styles.page} role="status" aria-label="Checking session">
      <Loader size="lg" />
    </div>
  )
}

export default SessionLoading