import { FiSearch, FiX } from 'react-icons/fi'
import styles from './OrderSearch.module.css'

function OrderSearch({ value, onChange, placeholder }) {
  return (
    <div className={styles.search}>
      <FiSearch size={16} className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        className={styles.input}
        placeholder={placeholder || 'Search by order number…'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search orders"
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <FiX size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default OrderSearch