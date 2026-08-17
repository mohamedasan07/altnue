import { CUSTOMER_STATUS_FILTERS } from '../../utils/customerStatus'
import styles from './CustomerFilters.module.css'

function CustomerFilters({ status, onStatusChange }) {
  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        <span className={styles.label}>Status</span>
        <select
          className={styles.select}
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label="Filter by status"
        >
          {CUSTOMER_STATUS_FILTERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default CustomerFilters