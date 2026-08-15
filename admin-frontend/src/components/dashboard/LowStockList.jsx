import { FiAlertTriangle } from 'react-icons/fi'
import styles from './LowStockList.module.css'

function LowStockList({ products = [] }) {
  return (
    <ul className={styles.list}>
      {products.map((product) => (
        <li key={product.id} className={styles.item}>
          <img
            className={styles.image}
            src={product.imageUrl}
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
