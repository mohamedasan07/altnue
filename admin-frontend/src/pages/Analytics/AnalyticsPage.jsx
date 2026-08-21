import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiBarChart,
  FiDollarSign,
  FiShoppingBag,
  FiTrendingUp,
  FiUsers,
  FiAlertTriangle,
  FiPackage,
} from 'react-icons/fi'
import * as dashboardService from '../../services/dashboard.service'
import StatCard from '../../components/dashboard/StatCard'
import SectionCard from '../../components/dashboard/SectionCard'
import SalesChart from '../../components/dashboard/SalesChart'
import RecentOrders from '../../components/dashboard/RecentOrders'
import LowStockList from '../../components/dashboard/LowStockList'
import StatusBreakdownList from '../../components/analytics/StatusBreakdownList'
import TopProductsTable from '../../components/analytics/TopProductsTable'
import OrdersTrendChart from '../../components/analytics/OrdersTrendChart'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import classNames from '../../utils/classNames'
import { formatMoney } from '../../utils/format'
import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
} from '../../utils/orderStatus'
import styles from './AnalyticsPage.module.css'

const TOP_PRODUCTS_LIMIT = 10
const RECENT_ORDERS_LIMIT = 5

/** Selectable sales-trend ranges (backend allows months 1–24). */
const RANGE_OPTIONS = [
  { months: 6, label: '6 months' },
  { months: 12, label: '12 months' },
]

/** Stat card definitions — same prop-driven StatCard the Dashboard renders. */
function buildStatCards(stats) {
  return [
    {
      id: 'revenue',
      label: 'Revenue',
      accent: 'green',
      icon: FiDollarSign,
      value: formatMoney(stats.totalRevenue),
      change: stats.revenueChangePercent,
      hint: 'vs last month',
    },
    {
      id: 'orders',
      label: 'Orders',
      accent: 'blue',
      icon: FiShoppingBag,
      value: String(stats.totalOrders ?? 0),
      change: stats.ordersChangePercent,
      hint: 'vs last month',
    },
    {
      id: 'aov',
      label: 'Avg Order Value',
      accent: 'purple',
      icon: FiTrendingUp,
      value:
        stats.averageOrderValue === null || stats.averageOrderValue === undefined
          ? '—'
          : formatMoney(stats.averageOrderValue),
      change: null,
      hint: 'per sale order',
    },
    {
      id: 'customers',
      label: 'Customers',
      accent: 'orange',
      icon: FiUsers,
      value: String(stats.totalCustomers ?? 0),
      change: stats.customersChangePercent,
      hint: 'vs last month',
    },
  ]
}

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

/**
 * Zero-filled status vocabularies -> StatusBreakdownList items, in schema
 * order with the exact badge accents the rest of the admin UI uses.
 */
function breakdownItems(breakdown, meta) {
  return Object.entries(meta).map(([value, entry]) => ({
    value,
    label: entry.label,
    accent: entry.accent,
    count: Number(breakdown?.[value]) || 0,
  }))
}

function AnalyticsPage() {
  const [stats, setStats] = useState(null)
  const [salesOverview, setSalesOverview] = useState([])
  const [bestSellers, setBestSellers] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [recentOrders, setRecentOrders] = useState([])

  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const requestIdRef = useRef(0)

  const [rangeMonths, setRangeMonths] = useState(6)
  const [trendLoading, setTrendLoading] = useState(false)
  const trendRequestIdRef = useRef(0)
  // Which range the current salesOverview reflects — getStats() ships the
  // default 6-month trend, so an explicit fetch is only needed after a change.
  const loadedRangeRef = useRef(6)

  const applyError = useCallback((message) => {
    setLoadError(message)
    setLoadState('error')
  }, [])

  // Initial load — four granular endpoints in parallel (the same functions the
  // aggregate composes, so numbers can never disagree between pages).
  useEffect(() => {
    const requestId = ++requestIdRef.current

    Promise.all([
      dashboardService.getStats(),
      dashboardService.getBestSellers(TOP_PRODUCTS_LIMIT),
      dashboardService.getLowStockProducts({}),
      dashboardService.getRecentOrders(RECENT_ORDERS_LIMIT),
    ])
      .then(([statsPayload, bestSellersData, lowStockData, recentOrdersData]) => {
        if (requestId !== requestIdRef.current) return
        setStats(statsPayload.stats || {})
        // The stats payload always carries the default-range trend.
        setSalesOverview(Array.isArray(statsPayload.salesOverview) ? statsPayload.salesOverview : [])
        loadedRangeRef.current = 6
        setBestSellers(bestSellersData)
        setLowStock(lowStockData)
        setRecentOrders(recentOrdersData)
        setLoadState('ready')
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return
        applyError(error.message)
      })
  }, [refresh, applyError])

  // Range changes re-fetch only the trend slice; the rest of the page stays
  // put. Loading starts in handleRangeChange (not here) so no state is set
  // synchronously inside the effect body.
  useEffect(() => {
    if (loadState !== 'ready') return
    if (loadedRangeRef.current === rangeMonths) return

    const requestId = ++trendRequestIdRef.current

    dashboardService
      .getSalesOverview(rangeMonths)
      .then((overview) => {
        if (requestId !== trendRequestIdRef.current) return
        loadedRangeRef.current = rangeMonths
        setSalesOverview(Array.isArray(overview) ? overview : [])
      })
      .catch(() => {
        // A failed range switch keeps the previously loaded trend on screen;
        // the selector simply stops spinning.
      })
      .finally(() => {
        if (requestId === trendRequestIdRef.current) setTrendLoading(false)
      })
  }, [rangeMonths, loadState])

  const handleRangeChange = (months) => {
    if (months === rangeMonths || trendLoading) return
    setTrendLoading(true)
    setRangeMonths(months)
  }

  const reload = () => {
    setLoadError('')
    setLoadState('loading')
    setRefresh((current) => current + 1)
  }

  const safeStats = stats || {}
  const statItems = buildStatCards(safeStats).map((card) => ({
    id: card.id,
    label: card.label,
    value: card.value,
    percentage: formatChange(card.change),
    hint: card.hint,
    trend: trendFor(card.change),
    accent: card.accent,
    icon: card.icon,
  }))

  const orderStatusItems = breakdownItems(safeStats.orderStatusBreakdown, ORDER_STATUS_META)
  const paymentStatusItems = breakdownItems(
    safeStats.paymentStatusBreakdown,
    PAYMENT_STATUS_META,
  )

  const trendSubtitle =
    salesOverview.length > 0
      ? `Monthly revenue · ${salesOverview[0].month} — ${salesOverview[salesOverview.length - 1].month}`
      : 'Monthly revenue'

  return (
    <div className={styles.page}>
      {/* ----- Page header ----- */}
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>Store performance at a glance</p>
        </div>

        <div className={styles.rangeGroup} role="group" aria-label="Sales trend range">
          {RANGE_OPTIONS.map(({ months, label }) => (
            <button
              key={months}
              type="button"
              className={classNames(styles.rangeButton, rangeMonths === months && styles.rangeButtonActive)}
              aria-pressed={rangeMonths === months}
              disabled={trendLoading}
              onClick={() => handleRangeChange(months)}
            >
              {label}
            </button>
          ))}
        </div>
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
            title="Couldn't load analytics"
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

          {/* ----- Revenue trend + order-status breakdown ----- */}
          <div className={styles.row}>
            <SectionCard
              title="Revenue Trend"
              subtitle={trendSubtitle}
              className={styles.primary}
            >
              <div className={classNames(styles.trendWrap, trendLoading && styles.trendLoading)}>
                {salesOverview.length > 0 ? (
                  <SalesChart data={salesOverview} />
                ) : (
                  <EmptyState
                    compact
                    icon={<FiBarChart size={24} />}
                    title="No sales data yet"
                    description="Revenue will appear here once orders are placed."
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard title="Order Status" subtitle="All orders by fulfilment status">
              <StatusBreakdownList items={orderStatusItems} />
            </SectionCard>
          </div>

          {/* ----- Orders trend + payment-status breakdown ----- */}
          <div className={styles.row}>
            <SectionCard
              title="Orders per Month"
              subtitle={`Order volume · last ${rangeMonths} months`}
              className={styles.primary}
            >
              <div className={classNames(styles.trendWrap, trendLoading && styles.trendLoading)}>
                {salesOverview.length > 0 ? (
                  <OrdersTrendChart data={salesOverview} />
                ) : (
                  <EmptyState
                    compact
                    icon={<FiShoppingBag size={24} />}
                    title="No order data yet"
                    description="Order volume will appear here once orders are placed."
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard title="Payment Status" subtitle="All orders by payment state">
              <StatusBreakdownList items={paymentStatusItems} />
            </SectionCard>
          </div>

          {/* ----- Top products + low stock ----- */}
          <div className={styles.row}>
            <SectionCard
              title="Top Products"
              subtitle="By units sold · cancelled and refunded excluded"
              className={styles.primary}
            >
              {bestSellers.length > 0 ? (
                <TopProductsTable products={bestSellers} />
              ) : (
                <EmptyState
                  compact
                  icon={<FiPackage size={24} />}
                  title="No product sales yet"
                  description="Best sellers will appear here once orders ship."
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

          {/* ----- Recent orders ----- */}
          <SectionCard
            title="Recent Orders"
            subtitle="Latest 5 orders"
            action={
              <Link to="/orders" className={styles.viewAllLink}>
                View all
              </Link>
            }
          >
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
        </>
      )}
    </div>
  )
}

export default AnalyticsPage
