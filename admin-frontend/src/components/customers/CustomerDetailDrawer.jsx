import { useEffect, useRef, useState } from 'react'
import { FiX, FiUsers, FiUser } from 'react-icons/fi'
import * as customerService from '../../services/customer.service'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import CustomerStatusBadge from './CustomerStatusBadge'
import CustomerStats from './CustomerStats'
import CustomerAddresses from './CustomerAddresses'
import CustomerOrders from './CustomerOrders'
import CustomerActivity from './CustomerActivity'
import { formatDate } from '../../utils/format'
import styles from './CustomerDetailDrawer.module.css'

const ORDER_LIMIT = 10

/** Round avatar with an initials (or FiUser) fallback when no image loads. */
function CustomerAvatar({ customer }) {
  const [failed, setFailed] = useState(false)
  const parts = [customer.firstName, customer.lastName].filter(Boolean)
  const initials = parts
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const name = parts.join(' ') || 'Unnamed Customer'

  if (!customer.avatarUrl || failed) {
    return (
      <span className={styles.avatarFallback} aria-hidden="true">
        {initials || <FiUser size={16} />}
      </span>
    )
  }

  return (
    <img
      className={styles.avatar}
      src={customer.avatarUrl}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function DrawerHeader({ onClose, children }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>{children}</div>
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Close"
      >
        <FiX size={18} />
      </button>
    </header>
  )
}

/**
 * Fetches + renders one customer's detail. Keyed by customerId (+ retry) in
 * CustomerDetailDrawer so a new customer always starts from the loading state
 * (Customer A data never lingers as B's). Order pagination refetches the same
 * detail with a new order page; the list page is never reloaded.
 */
function CustomerDetail({ customerId, onClose, onRetry }) {
  const [detail, setDetail] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | error
  const [loadError, setLoadError] = useState(null)
  const [orderPage, setOrderPage] = useState(1)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current

    customerService
      .getCustomer(customerId, { page: orderPage, limit: ORDER_LIMIT })
      .then((data) => {
        if (requestId !== requestIdRef.current) return
        setDetail(data)
        setState('ready')
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return
        setLoadError(error)
        setState('error')
      })
  }, [customerId, orderPage])

  if (state === 'loading') {
    return (
      <div className={styles.content}>
        <DrawerHeader onClose={onClose}>
          <div className={styles.identity}>
            <span className={styles.skeletonAvatar} aria-hidden="true" />
            <div className={styles.skeletonIdentity}>
              <span className={styles.skeletonLine} />
              <span className={styles.skeletonLineShort} />
            </div>
          </div>
        </DrawerHeader>

        <div className={styles.body} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className={styles.skeletonBlock} />
          ))}
        </div>
      </div>
    )
  }

  if (state === 'error') {
    const notFound = loadError?.status === 404
    return (
      <div className={styles.content}>
        <DrawerHeader onClose={onClose}>
          <span className={styles.headerTitle}>Customer Details</span>
        </DrawerHeader>

        <div className={styles.stateWrap}>
          <EmptyState
            icon={<FiUsers size={28} />}
            title={notFound ? 'Customer not found' : "Couldn't load customer"}
            description={
              notFound
                ? 'This customer may have been removed.'
                : loadError?.message
            }
            action={
              notFound ? undefined : (
                <Button variant="outline" onClick={onRetry}>
                  Try Again
                </Button>
              )
            }
          />
        </div>
      </div>
    )
  }

  const profile = detail?.profile || {}
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')

  return (
    <div className={styles.content}>
      {/* ----- Identity header ----- */}
      <DrawerHeader onClose={onClose}>
        <div className={styles.identity}>
          <CustomerAvatar customer={profile} />
          <div className={styles.identityText}>
            <span className={styles.name}>{name || 'Unnamed Customer'}</span>
            <span className={styles.email}>{profile.email || '—'}</span>
          </div>
          <CustomerStatusBadge status={profile.status} />
        </div>
      </DrawerHeader>

      <div className={styles.body}>
        {/* ----- Profile ----- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Profile</h3>
          <dl className={styles.defList}>
            <div>
              <dt>Name</dt>
              <dd>{name || 'Unnamed Customer'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile.email || '—'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{profile.phone || '—'}</dd>
            </div>
            <div>
              <dt>Member Since</dt>
              <dd>{formatDate(profile.createdAt)}</dd>
            </div>
            <div>
              <dt>Last Login</dt>
              <dd>
                {profile.lastLoginAt ? formatDate(profile.lastLoginAt) : 'Never'}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <CustomerStatusBadge status={profile.status} />
              </dd>
            </div>
          </dl>
        </section>

        {/* ----- Statistics ----- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Statistics</h3>
          <CustomerStats stats={detail?.stats} />
        </section>

        {/* ----- Addresses ----- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Addresses</h3>
          <CustomerAddresses addresses={detail?.addresses} />
        </section>

        {/* ----- Order history ----- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Orders</h3>
          <CustomerOrders orders={detail?.orders} onPageChange={setOrderPage} />
        </section>

        {/* ----- Activity ----- */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Activity</h3>
          <CustomerActivity activity={detail?.activity} />
        </section>
      </div>
    </div>
  )
}

/**
 * Right-side detail drawer. Mirrors the shared Modal's overlay behavior
 * (backdrop click, Escape, body scroll lock, focus restore) so it composes
 * with the existing admin shell without introducing a second modal system.
 */
function CustomerDetailDrawer({ customerId, onClose }) {
  const [retryKey, setRetryKey] = useState(0)
  const open = Boolean(customerId)
  const prevFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    prevFocusRef.current = document.activeElement

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      prevFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Customer details"
        onClick={(event) => event.stopPropagation()}
      >
        <CustomerDetail
          key={`${customerId}-${retryKey}`}
          customerId={customerId}
          onClose={onClose}
          onRetry={() => setRetryKey((current) => current + 1)}
        />
      </div>
    </div>
  )
}

export default CustomerDetailDrawer