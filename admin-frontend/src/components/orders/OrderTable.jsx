import { FiChevronUp, FiChevronDown } from 'react-icons/fi'
import OrderRow from './OrderRow'
import classNames from '../../utils/classNames'
import styles from './OrderTable.module.css'

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

function OrderTable({ orders, sort, order, onSort, onView }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <SortHeader
              label="Order"
              column="order_number"
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <th scope="col">Customer</th>
            <th scope="col">Items</th>
            <SortHeader
              label="Total"
              column="grand_total"
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <SortHeader
              label="Status"
              column="status"
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <th scope="col">Payment</th>
            <SortHeader
              label="Placed"
              column="placed_at"
              sort={sort}
              order={order}
              onSort={onSort}
            />
            <th scope="col" className={styles.actionsHead}>
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} onView={onView} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default OrderTable