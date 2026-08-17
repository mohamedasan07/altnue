import styles from './CustomerAddresses.module.css'

/**
 * Read-only address list rendered from the customer detail response. The
 * detail endpoint is the source of truth — no separate address API is called
 * and no add/edit/delete actions are offered.
 */
function CustomerAddresses({ addresses }) {
  const list = Array.isArray(addresses) ? addresses : []

  if (!list.length) {
    return <p className={styles.empty}>No addresses saved</p>
  }

  return (
    <ul className={styles.list}>
      {list.map((address) => {
        const addressLine = [
          address.address,
          address.city,
          address.state,
          address.pincode,
        ]
          .filter(Boolean)
          .join(', ')

        return (
          <li key={address.id} className={styles.card}>
            <div className={styles.head}>
              <span className={styles.name}>{address.name || '—'}</span>
              {address.isDefault && (
                <span className={styles.defaultBadge}>Default</span>
              )}
            </div>
            <span className={styles.meta}>{address.phone || '—'}</span>
            <span className={styles.meta}>{addressLine || '—'}</span>
            {address.country && (
              <span className={styles.meta}>{address.country}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default CustomerAddresses