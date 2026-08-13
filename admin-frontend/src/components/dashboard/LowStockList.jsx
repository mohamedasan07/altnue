import { FiAlertTriangle } from 'react-icons/fi'
import { lowStockProducts } from '../../data/dashboard'
import styles from './LowStockList.module.css'

function LowStockList() {
  return (
    <ul className={styles.list}>
      {lowStockProducts.map((product) => (
        <li key={product.id} className={styles.item}>
          <img
            className={styles.image}
            src={product.image}
            alt={product.name}
            loading="lazy"
          />
          <div className={styles.meta}>
            <span className={styles.name}>{product.name}</span>
            <span className={styles.category}>{product.category}</span>
          </div>
          <span className={styles.stock}>
            <FiAlertTriangle size={12} aria-hidden="true" />
            {product.stock} left
          </span>
        </li>
      ))}
    </ul>
  )
}

export default LowStockList
