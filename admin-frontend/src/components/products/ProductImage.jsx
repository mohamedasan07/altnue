import { useState } from 'react'
import { FiImage } from 'react-icons/fi'
import classNames from '../../utils/classNames'
import styles from './ProductImage.module.css'

/**
 * Product thumbnail with a graceful placeholder fallback when the URL is
 * missing or fails to load.
 */
function ProductImage({ src, alt, size = 'md', className }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <span
        className={classNames(styles.placeholder, styles[size], className)}
        role="img"
        aria-label={alt || 'Product image'}
      >
        <FiImage size={20} aria-hidden="true" />
      </span>
    )
  }

  return (
    <img
      className={classNames(styles.image, styles[size], className)}
      src={src}
      alt={alt || 'Product'}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export default ProductImage
