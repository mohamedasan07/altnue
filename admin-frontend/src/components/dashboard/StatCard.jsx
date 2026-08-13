import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import classNames from '../../utils/classNames'
import styles from './StatCard.module.css'

function StatCard({ stat }) {
  const { icon: Icon, label, value, percentage, hint, trend, accent } = stat
  const TrendIcon = trend === 'down' ? FiTrendingDown : FiTrendingUp

  return (
    <article className={classNames(styles.card, styles[accent])}>
      <div className={styles.top}>
        <span className={styles.iconWrap}>
          <Icon size={18} aria-hidden="true" />
        </span>

        <span
          className={classNames(
            styles.trend,
            trend === 'down' ? styles.trendDown : styles.trendUp,
          )}
        >
          <TrendIcon size={12} aria-hidden="true" />
          {percentage}
        </span>
      </div>

      <span className={styles.label}>{label}</span>
      <strong className={styles.value}>{value}</strong>
      <span className={styles.hint}>{hint}</span>
    </article>
  )
}

export default StatCard
