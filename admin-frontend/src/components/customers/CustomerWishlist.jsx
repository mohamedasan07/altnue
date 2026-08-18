import { useEffect, useRef, useState } from 'react'
import { FiHeart, FiImage } from 'react-icons/fi'
import * as customerService from '../../services/customer.service'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import classNames from '../../utils/classNames'
import { formatMoney } from '../../utils/format'
import styles from './CustomerWishlist.module.css'

/**
 * Read-only "Saved Items" list for the customer detail drawer (Sprint 22.4
 * Phase 4). Fetched in its own request (one wishlist call, no per-product
 * calls) so the section can show its own loading / error / retry states
 * without reloading the rest of the drawer. Keyed by customerId in the drawer
 * so switching customers always starts from a clean loading state.
 *
 * Items carry the live product snapshot from the backend. Products that were
 * deactivated stay visible with an "Unavailable" status instead of crashing;
 * out-of-stock products are marked separately.
 */

function WishlistImage({ item }) {
  const [failed, setFailed] = useState(false)

  if (!item.imageUrl || failed) {
    return (
      <span className={styles.imageFallback} aria-hidden="true">
        <FiImage size={16} />
      </span>
    )
  }

  return (
    <img
      className={styles.image}
      src={item.imageUrl}
      alt={item.name || 'Saved item'}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function WishlistCard({ item }) {
  const unavailable = item.isActive === false
  const outOfStock = !unavailable && Number(item.stockQuantity) <= 0

  const status = unavailable
    ? { label: 'Unavailable', tone: 'unavailable' }
    : outOfStock
      ? { label: 'Out of stock', tone: 'outOfStock' }
      : { label: 'In stock', tone: 'inStock' }

  return (
    <li className={styles.card}>
      <WishlistImage item={item} />
      <div className={styles.cardBody}>
        <span className={styles.name}>{item.name || 'Untitled'}</span>
        <span className={styles.category}>{item.category || '—'}</span>
        <span className={styles.price}>{formatMoney(item.price)}</span>
      </div>
      <span className={classNames(styles.status, styles[status.tone])}>
        {status.label}
      </span>
    </li>
  )
}

function CustomerWishlist({ customerId }) {
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [retry, setRetry] = useState(0)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current

    customerService
      .getCustomerWishlist(customerId)
      .then((list) => {
        if (requestId !== requestIdRef.current) return
        setItems(list)
        setState('ready')
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return
        setState('error')
      })
  }, [customerId, retry])

  const handleRetry = () => {
    setState('loading')
    setRetry((current) => current + 1)
  }

  if (state === 'loading') {
    return (
      <div className={styles.skeletonList} aria-hidden="true">
        {Array.from({ length: 2 }).map((_, index) => (
          <span key={index} className={styles.skeletonCard} />
        ))}
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className={styles.stateWrap}>
        <EmptyState
          compact
          icon={<FiHeart size={22} />}
          title="Couldn't load saved items"
          description="The customer's saved items could not be loaded."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
            >
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  if (!items.length) {
    return <p className={styles.empty}>No saved items</p>
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <WishlistCard key={item.id} item={item} />
      ))}
    </ul>
  )
}

export default CustomerWishlist