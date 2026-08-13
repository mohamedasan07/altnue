import { Link } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useAuth } from '../../hooks/useAuth'
import { dashboardStats, recentActivity } from '../../data/dashboard'
import StatCard from '../../components/dashboard/StatCard'
import SectionCard from '../../components/dashboard/SectionCard'
import SalesChart from '../../components/dashboard/SalesChart'
import RecentOrders from '../../components/dashboard/RecentOrders'
import LowStockList from '../../components/dashboard/LowStockList'
import ActivityItem from '../../components/dashboard/ActivityItem'
import QuickActions from '../../components/dashboard/QuickActions'
import styles from './DashboardPage.module.css'

function DashboardPage() {
  const { admin } = useAuth()
  const adminName = admin?.name || 'Administrator'

  return (
    <div className={styles.page}>
      {/* ----- Dashboard header ----- */}
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Welcome back, {adminName}</p>
        </div>

        <Link to="/products" className={styles.addButton}>
          <FiPlus size={16} aria-hidden="true" />
          Add Product
        </Link>
      </header>

      {/* ----- Statistics cards ----- */}
      <div className={styles.statsGrid}>
        {dashboardStats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      {/* ----- Sales overview + recent activity ----- */}
      <div className={styles.row}>
        <SectionCard
          title="Sales Overview"
          subtitle="Monthly revenue · Jan — Jun"
          className={styles.primary}
        >
          <SalesChart />
        </SectionCard>

        <SectionCard title="Recent Activity" subtitle="Latest store events">
          <ul className={styles.activityList}>
            {recentActivity.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* ----- Recent orders + low stock ----- */}
      <div className={styles.row}>
        <SectionCard title="Recent Orders" subtitle="Latest 5 orders">
          <RecentOrders />
        </SectionCard>

        <SectionCard title="Low Stock Products" subtitle="Items running out">
          <LowStockList />
        </SectionCard>
      </div>

      {/* ----- Quick actions ----- */}
      <SectionCard
        title="Quick Actions"
        subtitle="Jump straight to what matters"
      >
        <QuickActions />
      </SectionCard>
    </div>
  )
}

export default DashboardPage
