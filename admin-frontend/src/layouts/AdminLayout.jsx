import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import classNames from '../utils/classNames'
import styles from './AdminLayout.module.css'

function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  const handleToggleSidebar = useCallback(() => {
    if (window.innerWidth > 1024) {
      setDesktopCollapsed((prev) => !prev)
    } else {
      setMobileOpen((prev) => !prev)
    }
  }, [])

  return (
    <div className={styles.layout}>
      <Sidebar
        mobileOpen={mobileOpen}
        desktopCollapsed={desktopCollapsed}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {mobileOpen && (
        <button
          type="button"
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <div className={classNames(styles.main, desktopCollapsed && styles.mainCollapsed)}>
        <Topbar onToggleSidebar={handleToggleSidebar} />

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
