import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiUsers } from 'react-icons/fi'
import * as customerService from '../../services/customer.service'
import CustomerTable from '../../components/customers/CustomerTable'
import CustomerSearch from '../../components/customers/CustomerSearch'
import CustomerFilters from '../../components/customers/CustomerFilters'
import CustomerPagination from '../../components/customers/CustomerPagination'
import CustomerDetailDrawer from '../../components/customers/CustomerDetailDrawer'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import styles from './CustomersPage.module.css'

const PAGE_SIZE = 10

function CustomersPage() {
  const [customers, setCustomers] = useState([])
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
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)

  const [searchParams] = useSearchParams()
  const [viewCustomerId, setViewCustomerId] = useState(() => searchParams.get('view'))
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

  const applyCustomers = useCallback((data) => {
    setCustomers(Array.isArray(data?.customers) ? data.customers : [])
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
      sort,
      order,
    }

    customerService
      .listCustomers(params)
      .then((data) => {
        if (requestId !== requestIdRef.current) return
        // The requested page can go stale when filters narrow the result set.
        if (data.customers.length === 0 && data.pagination.total > 0 && page > 1) {
          setPage(1)
          return
        }
        applyCustomers(data)
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return
        applyError(error.message)
      })
  }, [page, debouncedQuery, status, sort, order, refresh, applyCustomers, applyError])

  const handleQueryChange = (value) => {
    setQuery(value)
    setPage(1)
  }

  const handleStatusChange = (value) => {
    setStatus(value)
    setPage(1)
    setLoadState('loading')
  }

  const handleSort = (column) => {
    if (sort === column) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(column)
      setOrder(column === 'created_at' ? 'desc' : 'asc')
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
    setPage(1)
    setLoadState('loading')
  }

  const reload = () => {
    setLoadError('')
    setLoadState('loading')
    setRefresh((current) => current + 1)
  }

  const hasFilters = Boolean(query.trim() || status !== 'all')

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
          <h1 className={styles.title}>Customers</h1>
          <p className={styles.subtitle}>Manage your customer accounts</p>
        </div>
      </header>

      <div className={styles.panel}>
        {/* ----- Toolbar ----- */}
        <div className={styles.toolbar}>
          <CustomerSearch value={query} onChange={handleQueryChange} />
          <CustomerFilters status={status} onStatusChange={handleStatusChange} />
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
              icon={<FiUsers size={28} />}
              title="Couldn't load customers"
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
              icon={<FiUsers size={28} />}
              title={hasFilters ? 'No customers found' : 'No customers yet'}
              description={
                hasFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Customers will appear here once they create an account.'
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
          <CustomerTable
            customers={customers}
            sort={sort}
            order={order}
            onSort={handleSort}
            onSelect={(customer) => setViewCustomerId(customer.id)}
          />
        )}

        {/* ----- Pagination ----- */}
        {loadState === 'ready' && total > 0 && (
          <CustomerPagination
            pagination={{ ...pagination, page: safePage }}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* ----- Detail drawer (read-only) ----- */}
      <CustomerDetailDrawer
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
      />
    </div>
  )
}

export default CustomersPage