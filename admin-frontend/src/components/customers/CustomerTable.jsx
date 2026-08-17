import { FiChevronUp, FiChevronDown } from 'react-icons/fi'
import CustomerRow from './CustomerRow'
import classNames from '../../utils/classNames'
import styles from './CustomerTable.module.css'

/** Sortable column header — clicking toggles asc/desc for the active column. */
function SortHeader({ label, column, sort, order, onSort }) {
  const active = sort === column
  return (
    <th scope="col">
      <button
        type="button"
        className={classNames(styles.sort, active && styles.sortActive)}
        onClick={() => onSort(column)}
        aria-label={`Sort by ${label}`}
        aria-sort={
          active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'
        }
      >
        {label}
        {active &&
          (order === 'asc' ? (
            <FiChevronUp size={14} aria-hidden="true" />
          ) : (
            <FiChevronDown size={14} aria-hidden="true" />
          ))}
      </button>
    </th>
  )
}

function CustomerTable({ customers, sort, order, onSort, onSelect }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <SortHeader
              label="Customer"
              column="first_name"
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <SortHeader
              label="Email"
              column="email"
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <th scope="col">Phone</th>
            <SortHeader
              label="Joined"
              column="created_at"
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <SortHeader
              label="Last Login"
              column="last_login_at"
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CustomerTable