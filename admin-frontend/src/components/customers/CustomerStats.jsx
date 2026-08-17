import { formatMoney } from '../../utils/format'
import styles from './CustomerStats.module.css'

/**
 * Read-only stats tiles. Backend values are authoritative — never recalculated
 * here. Zeros render as ₹0 / 0 orders / ₹0 average (never treated as missing).
 */
function CustomerStats({ stats }) {
  const totalOrders = Number(stats?.totalOrders) || 0
  const totalSpent = Number(stats?.totalSpent) || 0
  const averageOrderValue = Number(stats?.averageOrderValue) || 0

  const tiles = [
    {
      label: 'Total Orders',
      value: `${totalOrders} order${totalOrders === 1 ? '' : 's'}`,
    },
    { label: 'Total Spent', value: formatMoney(totalSpent) },
    { label: 'Average Order Value', value: formatMoney(averageOrderValue) },
  ]

  return (
    <div className={styles.stats}>
      {tiles.map((tile) => (
        <div key={tile.label} className={styles.tile}>
          <span className={styles.label}>{tile.label}</span>
          <span className={styles.value}>{tile.value}</span>
        </div>
      ))}
    </div>
  )
}

export default CustomerStats