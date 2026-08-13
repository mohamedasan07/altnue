import { FiPackage, FiShoppingBag, FiTruck, FiEdit3 } from 'react-icons/fi'
import classNames from '../../utils/classNames'
import styles from './ActivityItem.module.css'

const TYPE_MAP = {
  product: { icon: FiPackage, accent: 'product' },
  order: { icon: FiShoppingBag, accent: 'order' },
  ship: { icon: FiTruck, accent: 'ship' },
  update: { icon: FiEdit3, accent: 'update' },
}

function ActivityItem({ activity }) {
  const { title, detail, time, type } = activity
  const { icon: Icon, accent } = TYPE_MAP[type] || TYPE_MAP.update

  return (
    <li className={styles.item}>
      <span className={classNames(styles.marker, styles[accent])}>
        <Icon size={14} aria-hidden="true" />
      </span>

      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.detail}>{detail}</span>
      </div>

      <time className={styles.time} dateTime={time}>
        {time}
      </time>
    </li>
  )
}

export default ActivityItem
