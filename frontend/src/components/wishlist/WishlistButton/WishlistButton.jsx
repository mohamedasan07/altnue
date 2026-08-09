import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useIsWishlisted, useWishlistActions } from '../../../hooks/useWishlist';
import styles from './WishlistButton.module.css';

const HEART_PATH = 'M12 20s-7-4.6-7-10.1A4.4 4.4 0 0 1 12 6a4.4 4.4 0 0 1 7 3.8C19 15.4 12 20 12 20z';

/**
 * Reusable wishlist heart toggle. Outline when unsaved, filled when saved,
 * with a spring pop. Sized via `size`; positioning/layout overridable via className.
 */
export default function WishlistButton({ product, size = 'md', className }) {
  const { toggleWishlist } = useWishlistActions();
  const saved = useIsWishlisted(product?.id);
  const reduceMotion = useReducedMotion();
  const name = product?.name || 'this product';

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const iconSize = size === 'sm' ? 18 : 20;

  return (
    <button
      type="button"
      className={cn(styles.btn, styles[size], saved && styles.active, className)}
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
    >
      <motion.svg
        className={styles.icon}
        viewBox="0 0 24 24"
        width={iconSize}
        height={iconSize}
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={reduceMotion ? undefined : saved ? 'saved' : 'idle'}
        variants={
          reduceMotion
            ? undefined
            : {
                idle: { scale: 1 },
                saved: {
                  scale: [1, 1.35, 1],
                  transition: { duration: 0.45, times: [0, 0.5, 1], ease: 'easeOut' },
                },
              }
        }
        aria-hidden="true"
      >
        <path d={HEART_PATH} />
      </motion.svg>
    </button>
  );
}