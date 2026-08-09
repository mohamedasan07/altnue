import { useState } from 'react';
import styles from './ItemThumb.module.css';

/**
 * Small product thumbnail with a graceful fallback: while no imageUrl is
 * present (mock orders) it shows the product's initial on a dark tile.
 */
export default function ItemThumb({ item, alt }) {
  const [failed, setFailed] = useState(false);
  const name = item?.name || 'U';
  const src = item?.imageUrl;
  const showImage = src && !failed;

  return (
    <span className={styles.thumb} aria-hidden="true">
      {showImage ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className={styles.placeholder}>{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}