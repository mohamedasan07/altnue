import { useWishlist } from '../../hooks/useWishlist';
import WishlistGrid from '../../components/wishlist/WishlistGrid/WishlistGrid';
import WishlistEmpty from '../../components/wishlist/WishlistEmpty/WishlistEmpty';
import Button from '../../components/ui/Button/Button';
import styles from './WishlistPage.module.css';

export default function WishlistPage() {
  const { items, count, clearWishlist } = useWishlist();
  const hasItems = items.length > 0;

  return (
    <section className={`page ${styles.page}`} aria-labelledby="wishlist-title">
      <header className={styles.header}>
        <p className="page-kicker">Saved</p>
        <h1 id="wishlist-title" className="page-title">
          Wishlist.
        </h1>
        <p className="page-lead">
          {count === 1
            ? 'One saved piece, ready when you are.'
            : `${count} saved pieces, ready when you are.`}
        </p>
        {hasItems && (
          <button type="button" className={styles.clear} onClick={clearWishlist}>
            Clear wishlist
          </button>
        )}
      </header>

      {hasItems ? (
        <WishlistGrid products={items} />
      ) : (
        <WishlistEmpty />
      )}

      {hasItems && (
        <div className={styles.footer}>
          <Button to="/collections" variant="outline" size="md">
            Continue Shopping
          </Button>
        </div>
      )}
    </section>
  );
}