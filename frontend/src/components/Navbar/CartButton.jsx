import { useCart } from '../../hooks/useCart';
import styles from './Navbar.module.css';

const CART_ICON = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 7h14l-1 13H6L5 7z" />
    <path d="M9 7a3 3 0 0 1 6 0" />
  </svg>
);

/**
 * Cart button — live item count from cart state, opens the cart drawer.
 */
export default function CartButton() {
  const { count, openCart } = useCart();
  const label = count > 0 ? `Open cart, ${count} items` : 'Open cart';

  return (
    <button type="button" className={styles.iconLink} onClick={openCart} aria-label={label}>
      {CART_ICON}
      {count > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
      <span className="visually-hidden">
        Cart, {count} {count === 1 ? 'item' : 'items'}
      </span>
    </button>
  );
}