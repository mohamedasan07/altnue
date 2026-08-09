import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { loadWishlist, saveWishlist } from '../services/wishlistStorage';

// Two contexts: an always-stable "store" (subscribe/getSnapshot + actions) so
// per-item subscription via useIsWishlisted never re-renders on data churn,
// and a changing "data" context for page-level consumers (grid, badge).
const WishlistStoreContext = createContext(null);
const WishlistDataContext = createContext(null);

const sameId = (a, b) => String(a) === String(b);

export function WishlistProvider({ children }) {
  const [items, setItemsState] = useState(loadWishlist);
  const itemsRef = useRef(items);
  const listenersRef = useRef(new Set());

  const setItems = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(itemsRef.current) : updater;
    if (next === itemsRef.current) return;
    itemsRef.current = next;
    setItemsState(next);
    saveWishlist(next);
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const getSnapshot = useCallback(() => itemsRef.current, []);

  const isWishlisted = useCallback(
    (productId) => itemsRef.current.some((item) => sameId(item.id, productId)),
    []
  );

  const addToWishlist = useCallback(
    (product) => {
      if (!product?.id) return;
      setItems((prev) =>
        prev.some((item) => sameId(item.id, product.id)) ? prev : [...prev, product]
      );
    },
    [setItems]
  );

  const removeFromWishlist = useCallback(
    (productId) => {
      if (productId === undefined || productId === null) return;
      setItems((prev) => prev.filter((item) => !sameId(item.id, productId)));
    },
    [setItems]
  );

  const toggleWishlist = useCallback(
    (product) => {
      if (!product?.id) return;
      setItems((prev) =>
        prev.some((item) => sameId(item.id, product.id))
          ? prev.filter((item) => !sameId(item.id, product.id))
          : [...prev, product]
      );
    },
    [setItems]
  );

  const clearWishlist = useCallback(() => setItems([]), [setItems]);

  // Stable forever: subscribe/getSnapshot + actions never change identity.
  const storeValue = useMemo(
    () => ({
      subscribe,
      getSnapshot,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      clearWishlist,
    }),
    [subscribe, getSnapshot, isWishlisted, addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist]
  );

  // Changes on every wishlist mutation.
  const dataValue = useMemo(() => ({ items, count: items.length }), [items]);

  return (
    <WishlistStoreContext.Provider value={storeValue}>
      <WishlistDataContext.Provider value={dataValue}>{children}</WishlistDataContext.Provider>
    </WishlistStoreContext.Provider>
  );
}

export function useWishlist() {
  const store = useContext(WishlistStoreContext);
  const data = useContext(WishlistDataContext);
  if (!store || !data) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return { ...store, ...data };
}

/** Stable set of wishlist actions — safe for memoized leaf components. */
export function useWishlistActions() {
  const store = useContext(WishlistStoreContext);
  if (!store) throw new Error('useWishlistActions must be used within a WishlistProvider');
  return store;
}

/**
 * Per-product membership selector. The component re-renders only when *its* id
 * leaves/enters the wishlist, never when other items change.
 */
export function useIsWishlisted(productId) {
  const store = useContext(WishlistStoreContext);
  const subscribe = store?.subscribe ?? (() => () => {});
  const selectIsWishlisted = useCallback(
    () => (store ? store.getSnapshot().some((item) => sameId(item.id, productId)) : false),
    [store, productId]
  );
  return useSyncExternalStore(subscribe, selectIsWishlisted);
}