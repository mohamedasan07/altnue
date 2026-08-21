import styles from './TopProductsTable.module.css'

/**
 * Top products table (Sprint 22.6) — rank / product / units sold, straight
 * from GET /admin/dashboard/best-sellers (revenue-eligible orders only).
 */
function TopProductsTable({ products = [] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.rankCol}>
              #
            </th>
            <th scope="col">Product</th>
            <th scope="col" className={styles.unitsCol}>
              Units Sold
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={product.productId ?? `${product.name}-${index}`}>
              <td className={styles.rank}>{index + 1}</td>
              <td className={styles.name}>{product.name}</td>
              <td className={styles.units}>{product.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TopProductsTable
