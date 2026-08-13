import { STATUS_FILTERS, formatCategory } from '../../utils/productStatus'
import styles from './ProductFilters.module.css'

function ProductFilters({
  categories,
  category,
  status,
  onCategoryChange,
  onStatusChange,
}) {
  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        <span className={styles.label}>Category</span>
        <select
          className={styles.select}
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {formatCategory(item)}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Status</span>
        <select
          className={styles.select}
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default ProductFilters
