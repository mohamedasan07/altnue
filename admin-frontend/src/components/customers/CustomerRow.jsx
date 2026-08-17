import { useState } from 'react'
import { FiUser } from 'react-icons/fi'
import CustomerStatusBadge from './CustomerStatusBadge'
import { formatDate } from '../../utils/format'
import styles from './CustomerRow.module.css'

function buildInitials(customer) {
  const parts = [customer.firstName, customer.lastName].filter(Boolean)
  if (!parts.length) return null
  return parts
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function CustomerAvatar({ customer }) {
  const [failed, setFailed] = useState(false)
  const initials = buildInitials(customer)
  const alt = [customer.firstName, customer.lastName].filter(Boolean).join(' ')

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
      alt={alt || 'Customer'}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function CustomerRow({ customer, onSelect }) {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ')
  const handleSelect = () => onSelect?.(customer)

  return (
    <tr onClick={handleSelect} className={styles.clickable}>
      <td>
        <button
          type="button"
          className={styles.select}
          onClick={(event) => {
            event.stopPropagation()
            handleSelect()
          }}
          aria-label={`View details for ${name || 'Unnamed Customer'}`}
        >
          <CustomerAvatar customer={customer} />
          <span className={styles.name}>{name || 'Unnamed Customer'}</span>
        </button>
      </td>

      <td className={styles.email}>{customer.email || '—'}</td>

      <td className={styles.phone}>{customer.phone || '—'}</td>

      <td className={styles.date}>{formatDate(customer.createdAt)}</td>

      <td className={styles.date}>
        {customer.lastLoginAt ? formatDate(customer.lastLoginAt) : 'Never'}
      </td>

      <td>
        <CustomerStatusBadge status={customer.status} />
      </td>
    </tr>
  )
}

export default CustomerRow