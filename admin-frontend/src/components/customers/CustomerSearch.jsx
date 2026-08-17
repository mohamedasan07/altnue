import { FiSearch, FiX } from 'react-icons/fi'
import styles from './CustomerSearch.module.css'

function CustomerSearch({ value, onChange, placeholder }) {
  return (
    <div className={styles.search}>
      <FiSearch size={16} className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        className={styles.input}
        placeholder={placeholder || 'Search by name, email, or phone…'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search customers"
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

export default CustomerSearch