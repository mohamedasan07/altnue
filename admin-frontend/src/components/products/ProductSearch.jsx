import { FiSearch, FiX } from 'react-icons/fi'
import styles from './ProductSearch.module.css'

function ProductSearch({ value, onChange, placeholder }) {
  return (
    <div className={styles.search}>
      <FiSearch size={16} className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        className={styles.input}
        placeholder={placeholder || 'Search products by name…'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search products"
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

export default ProductSearch
