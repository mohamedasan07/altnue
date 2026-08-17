import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import Button from '../ui/Button'
import styles from './CustomerPagination.module.css'

function CustomerPagination({ pagination, rangeStart, rangeEnd, onPageChange }) {
  const page = Number(pagination.page) || 1
  const totalPages = Number(pagination.totalPages) || 1
  const total = Number(pagination.total) || 0

  if (total === 0) return null

  return (
    <div className={styles.pagination}>
      <span className={styles.range}>
        Showing {rangeStart}–{rangeEnd} of {total} customers
      </span>

      <div className={styles.pageButtons}>
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <FiChevronLeft size={16} aria-hidden="true" />
          Previous
        </Button>

        <span className={styles.pageInfo}>
          Page {page} of {totalPages}
        </span>

        <Button
          variant="outline"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
          <FiChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

export default CustomerPagination