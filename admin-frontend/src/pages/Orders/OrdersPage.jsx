import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiShoppingBag } from 'react-icons/fi'
import * as orderService from '../../services/order.service'
import OrderTable from '../../components/orders/OrderTable'
import OrderSearch from '../../components/orders/OrderSearch'
import OrderFilters from '../../components/orders/OrderFilters'
import OrderPagination from '../../components/orders/OrderPagination'
import OrderDetailDrawer from '../../components/orders/OrderDetailDrawer'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import styles from './OrdersPage.module.css'

const PAGE_SIZE = 10

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState('')

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [sort, setSort] = useState('placed_at')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)

  const [searchParams] = useSearchParams()
  const [viewOrderId, setViewOrderId] = useState(() => searchParams.get('view'))
  const requestIdRef = useRef(0)

  // Debounce the search box so keystrokes don't fire a request each time.
  // Only commits when the trimmed value actually changed (avoids a redundant
  // reload on mount), and flips to loading inside the async timer callback.
  useEffect(() => {
    const trimmed = query.trim()
    const timer = setTimeout(() => {
      if (trimmed !== debouncedQuery) {
        setDebouncedQuery(trimmed)
        setLoadState('loading')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [query, debouncedQuery])

  const applyOrders = useCallback((data) => {
    setOrders(Array.isArray(data?.orders) ? data.orders : [])
    setPagination(
      data?.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
    )
    setLoadState('ready')
  }, [])

  const applyError = useCallback((message) => {
    setLoadError(message)
    setLoadState('error')
  }, [])

  useEffect(() => {
    const requestId = ++requestIdRef.current

    const params = {
      page,
      limit: PAGE_SIZE,
      search: debouncedQuery || undefined,
      status: status === 'all' ? undefined : status,
      paymentStatus: paymentStatus === 'all' ? undefined : paymentStatus,
      sort,
      order,
    }

    orderService
      .listOrders(params)
      .then((data) => {
        if (requestId !== requestIdRef.current) return
        // The requested page can go stale when filters narrow the result set.
        if (data.orders.length === 0 && data.pagination.total > 0 && page > 1) {
          setPage(1)
          return
        }
        applyOrders(data)
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return
        applyError(error.message)
      })
  }, [page, debouncedQuery, status, paymentStatus, sort, order, refresh, applyOrders, applyError])

  const handleQueryChange = (value) => {
    setQuery(value)
    setPage(1)
  }

  const handleStatusChange = (value) => {
    setStatus(value)
    setPage(1)
    setLoadState('loading')
  }

  const handlePaymentChange = (value) => {
    setPaymentStatus(value)
    setPage(1)
    setLoadState('loading')
  }

  const handleSort = (column) => {
    if (sort === column) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(column)
      setOrder(column === 'placed_at' ? 'desc' : 'asc')
    }
    setPage(1)
    setLoadState('loading')
  }

  const handlePageChange = (nextPage) => {
    setPage(nextPage)
    setLoadState('loading')
  }

  const clearFilters = () => {
    setQuery('')
    setStatus('all')
    setPaymentStatus('all')
    setPage(1)
    setLoadState('loading')
  }

  const reload = () => {
    setLoadError('')
    setLoadState('loading')
    setRefresh((current) => current + 1)
  }

  // Silent list refresh after a status/payment update in the detail drawer —
  // keeps current rows on screen until the fresh page arrives.
  const handleOrderUpdated = () => {
    setRefresh((current) => current + 1)
  }

  const hasFilters = Boolean(query.trim() || status !== 'all' || paymentStatus !== 'all')

  const total = Number(pagination.total) || 0
  const totalPages = Number(pagination.totalPages) || 1
  const safePage = Math.min(page, totalPages)
  const rangeStart = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, total)

  return (
    <div className={styles.page}>
      {/* ----- Header ----- */}
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.subtitle}>Manage customer orders</p>
        </div>
      </header>

      <div className={styles.panel}>
        {/* ----- Toolbar ----- */}
        <div className={styles.toolbar}>
          <OrderSearch value={query} onChange={handleQueryChange} />
          <OrderFilters
            status={status}
            paymentStatus={paymentStatus}
            onStatusChange={handleStatusChange}
            onPaymentChange={handlePaymentChange}
          />
        </div>

        {/* ----- Body states ----- */}
        {loadState === 'loading' && (
          <div className={styles.skeleton} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={styles.skeletonRow}>
                <span className={styles.skeletonLineShort} />
                <span className={styles.skeletonLine} />
                <span className={styles.skeletonLineShort} />
              </div>
            ))}
          </div>
        )}

        {loadState === 'error' && (
          <div className={styles.stateWrap}>
            <EmptyState
              icon={<FiShoppingBag size={28} />}
              title="Couldn't load orders"
              description={loadError}
              action={
                <Button variant="outline" onClick={reload}>
                  Try Again
                </Button>
              }
            />
          </div>
        )}

        {loadState === 'ready' && total === 0 && (
          <div className={styles.stateWrap}>
            <EmptyState
              icon={<FiShoppingBag size={28} />}
              title={hasFilters ? 'No orders found' : 'No orders yet'}
              description={
                hasFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Orders will appear here once customers check out.'
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        {loadState === 'ready' && total > 0 && (
          <OrderTable
            orders={orders}
            sort={sort}
            order={order}
            onSort={handleSort}
            onView={(item) => setViewOrderId(item.id)}
          />
        )}

        {/* ----- Pagination ----- */}
        {loadState === 'ready' && total > 0 && (
          <OrderPagination
            pagination={{ ...pagination, page: safePage }}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* ----- Detail drawer (read/write: status + payment) ----- */}
      <OrderDetailDrawer
        orderId={viewOrderId}
        onClose={() => setViewOrderId(null)}
        onOrderUpdated={handleOrderUpdated}
      />
    </div>
  )
}

export default OrdersPage