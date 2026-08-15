import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiPlus,
  FiDollarSign,
  FiShoppingBag,
  FiPackage,
  FiUsers,
  FiBarChart,
  FiActivity,
  FiAlertTriangle,
} from 'react-icons/fi'
import { useAuth } from '../../hooks/useAuth'
import * as dashboardService from '../../services/dashboard.service'
import StatCard from '../../components/dashboard/StatCard'
import SectionCard from '../../components/dashboard/SectionCard'
import SalesChart from '../../components/dashboard/SalesChart'
import RecentOrders from '../../components/dashboard/RecentOrders'
import LowStockList from '../../components/dashboard/LowStockList'
import ActivityItem from '../../components/dashboard/ActivityItem'
import QuickActions from '../../components/dashboard/QuickActions'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { formatMoney, timeAgo } from '../../utils/format'
import styles from './DashboardPage.module.css'

// Stat card definitions — the live payload maps onto the exact props the
// prop-driven StatCard component already renders (icon/label/value/percentage/
// hint/trend/accent). Icons + accents are unchanged from the original layout.
const STAT_CARDS = [
  {
    id: 'revenue',
    label: 'Revenue',
    accent: 'green',
    icon: FiDollarSign,
    value: (s) => formatMoney(s.totalRevenue),
    change: (s) => s.revenueChangePercent,
  },
  {
    id: 'orders',
    label: 'Orders',
    accent: 'blue',
    icon: FiShoppingBag,
    value: (s) => String(s.totalOrders ?? 0),
    change: (s) => s.ordersChangePercent,
  },
  {
    id: 'products',
    label: 'Products',
    accent: 'purple',
    icon: FiPackage,
    value: (s) => String(s.totalProducts ?? 0),
    change: (s) => s.productsChangePercent,
  },
  {
    id: 'customers',
    label: 'Customers',
    accent: 'orange',
    icon: FiUsers,
    value: (s) => String(s.totalCustomers ?? 0),
    change: (s) => s.customersChangePercent,
  },
]

/** "+12.5%" / "-3%" — or "—" when the backend reports no baseline (null). */
function formatChange(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  return `${n > 0 ? '+' : ''}${n}%`
}

/** Map a change percent to the StatCard trend (null => neutral "up"). */
function trendFor(value) {
  return typeof value === 'number' && value < 0 ? 'down' : 'up'
}

function DashboardPage() {
  const { admin } = useAuth()
  const adminName = admin?.name || 'Administrator'

  const [data, setData] = useState(null)
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const requestIdRef = useRef(0)

  const applyData = useCallback((payload) => {
    setData(payload)
    setLoadState('ready')
  }, [])

  const applyError = useCallback((message) => {
    setLoadError(message)
    setLoadState('error')
  }, [])

  useEffect(() => {
    const requestId = ++requestIdRef.current

    dashboardService
      .getDashboard()
      .then((payload) => {
        if (requestId !== requestIdRef.current) return
        applyData(payload)
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return
        applyError(error.message)
      })
  }, [refresh, applyData, applyError])

  const reload = () => {
    setLoadError('')
    setLoadState('loading')
    setRefresh((current) => current + 1)
  }

  const stats = data?.stats || {}
  const salesOverview = Array.isArray(data?.salesOverview) ? data.salesOverview : []
  const recentOrders = Array.isArray(data?.recentOrders) ? data.recentOrders : []
  const lowStock = Array.isArray(data?.lowStockProducts) ? data.lowStockProducts : []
  const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : []

  const statItems = STAT_CARDS.map((card) => ({
    id: card.id,
    label: card.label,
    value: card.value(stats),
    percentage: formatChange(card.change(stats)),
    hint: 'vs last month',
    trend: trendFor(card.change(stats)),
    accent: card.accent,
    icon: card.icon,
  }))

  const activityItems = recentActivity.map((activity) => ({
    ...activity,
    time: timeAgo(activity.time),
  }))

  const subtitle =
    salesOverview.length > 0
      ? `Monthly revenue · ${salesOverview[0].month} — ${salesOverview[salesOverview.length - 1].month}`
      : 'Monthly revenue'

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

      {loadState === 'loading' && (
        <div className={styles.skeletonWrap} aria-hidden="true">
          <div className={styles.skeletonStats}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={styles.skeletonCard} />
            ))}
          </div>
          <div className={styles.skeletonRows}>
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className={styles.skeletonRow} />
            ))}
          </div>
        </div>
      )}

      {loadState === 'error' && (
        <div className={styles.stateWrap}>
          <EmptyState
            icon={<FiBarChart size={28} />}
            title="Couldn't load the dashboard"
            description={loadError}
            action={
              <Button variant="outline" onClick={reload}>
                Try Again
              </Button>
            }
          />
        </div>
      )}

      {loadState === 'ready' && (
        <>
          {/* ----- Statistics cards ----- */}
          <div className={styles.statsGrid}>
            {statItems.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>

          {/* ----- Sales overview + recent activity ----- */}
          <div className={styles.row}>
            <SectionCard title="Sales Overview" subtitle={subtitle} className={styles.primary}>
              {salesOverview.length > 0 ? (
                <SalesChart data={salesOverview} />
              ) : (
                <EmptyState
                  compact
                  icon={<FiBarChart size={24} />}
                  title="No sales data yet"
                  description="Sales figures will appear here once orders are placed."
                />
              )}
            </SectionCard>

            <SectionCard title="Recent Activity" subtitle="Latest store events">
              {activityItems.length > 0 ? (
                <ul className={styles.activityList}>
                  {activityItems.map((activity, index) => (
                    <ActivityItem
                      key={activity.id || `${activity.type}-${index}`}
                      activity={activity}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  compact
                  icon={<FiActivity size={24} />}
                  title="No recent activity"
                  description="Store events will appear here as they happen."
                />
              )}
            </SectionCard>
          </div>

          {/* ----- Recent orders + low stock ----- */}
          <div className={styles.row}>
            <SectionCard title="Recent Orders" subtitle="Latest 5 orders">
              {recentOrders.length > 0 ? (
                <RecentOrders orders={recentOrders} />
              ) : (
                <EmptyState
                  compact
                  icon={<FiShoppingBag size={24} />}
                  title="No orders yet"
                  description="Orders will appear here once customers check out."
                />
              )}
            </SectionCard>

            <SectionCard title="Low Stock Products" subtitle="Items running out">
              {lowStock.length > 0 ? (
                <LowStockList products={lowStock} />
              ) : (
                <EmptyState
                  compact
                  icon={<FiAlertTriangle size={24} />}
                  title="Nothing low on stock"
                  description="Products at or below the stock threshold will appear here."
                />
              )}
            </SectionCard>
          </div>

          {/* ----- Quick actions ----- */}
          <SectionCard
            title="Quick Actions"
            subtitle="Jump straight to what matters"
          >
            <QuickActions />
          </SectionCard>
        </>
      )}
    </div>
  )
}

export default DashboardPage