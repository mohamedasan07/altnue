import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  clearStoredWishlist,
  loadWishlist,
  saveWishlist,
} from '../services/wishlistStorage';
import {
  addWishlistItem,
  fetchWishlist,
  removeWishlistItem,
} from '../services/wishlist';
import { useAuth } from './AuthContext';

// Two contexts: an always-stable "store" (subscribe/getSnapshot + actions) so
// per-item subscription via useIsWishlisted never re-renders on data churn,
// and a changing "data" context for page-level consumers (grid, badge).
const WishlistStoreContext = createContext(null);
const WishlistDataContext = createContext(null);

const sameId = (a, b) => String(a) === String(b);

const errorMessage = (err) => err?.message || 'Something went wrong. Please try again.';

/**
 * Map a backend wishlist item to the existing WishlistContext product
 * representation. The store keys items by PRODUCT id (item.id), so membership
 * checks, removal and ProductCard/Dashboard links keep working exactly as
 * before. oldPrice/sale are optional display fields the UI already defaults;
 * they map defensively and stay 0/false when the backend omits them.
 */
function toStoreItem(item) {
  if (!item || item.productId === undefined || item.productId === null) return null;
  return {
    id: item.productId,
    productId: item.productId,
    name: item.name || 'Untitled',
    price: Number(item.price) || 0,
    oldPrice: Number(item.oldPrice) || 0,
    imageUrl: item.imageUrl || '',
    category: item.category || '',
    stockQuantity: Number(item.stockQuantity) || 0,
    isActive: item.isActive !== false,
  };
}

/**
 * Merge the authoritative server item from POST into an optimistic entry. The
 * backend is the source of truth for the fields it provides, while the
 * optimistic product snapshot keeps the display-only fields (oldPrice, sale,
 * description) the backend does not return.
 */
function applyServerItem(entry, item) {
  if (!item) return entry;
  return {
    ...entry,
    id: item.productId,
    productId: item.productId,
    name: item.name || entry.name || 'Untitled',
    price: Number(item.price) || 0,
    imageUrl: item.imageUrl || entry.imageUrl || '',
    category: item.category || entry.category || '',
    stockQuantity: Number(item.stockQuantity) || 0,
    isActive: item.isActive !== false,
  };
}

/**
 * Wishlist provider (Sprint 22.4 Phase 2/3) — account-backed for authenticated
 * customers, with the guest → account merge on login.
 *
 * The public API is intentionally identical to the previous localStorage
 * implementation so every consumer (WishlistPage, WishlistGrid, WishlistButton,
 * WishlistBadge, DashboardPage) works without change:
 *   { subscribe, getSnapshot, isWishlisted, addToWishlist,
 *     removeFromWishlist, toggleWishlist, clearWishlist }
 * plus { items, count } and additive loading/error state: isLoading, error.
 *
 * Source of truth:
 *   - Guests        → localStorage (existing behavior, unchanged)
 *   - Authenticated → the backend owns the list. On the guest→authenticated
 *                     transition the stored guest wishlist is merged into the
 *                     account (only the missing productIds are POSTed) and the
 *                     guest storage is cleared only after the merge fully
 *                     succeeds; until then it is preserved as the recovery copy
 *                     for Phase 3 failure handling.
 *
 * Mutations stay optimistic for the existing UX; on API failure the previous
 * state is restored so the UI never claims an item was saved/removed when the
 * backend rejected it.
 */
export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  // At first render auth is already resolved (stored session): seed the guest
  // list only when logged out, so an authenticated refresh never flashes the
  // guest list before the server wishlist loads.
  const [items, setItemsState] = useState(() => (isAuthenticated ? [] : loadWishlist()));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const itemsRef = useRef(items);
  const listenersRef = useRef(new Set());
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;
  const queueRef = useRef(Promise.resolve());

  /** Serialize server applies so responses never race each other. */
  const enqueue = useCallback((task) => {
    const run = queueRef.current.then(task, task);
    queueRef.current = run.catch(() => {});
    return run;
  }, []);

  /**
   * Apply a store update. localStorage is the persistent store for GUESTS only
   * (authRef.current false) — authenticated state never touches localStorage so
   * the guest wishlist survives a login for the Phase 3 merge.
   */
  const setItems = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(itemsRef.current) : updater;
    if (next === itemsRef.current) return;
    itemsRef.current = next;
    setItemsState(next);
    if (!authRef.current) saveWishlist(next);
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const getSnapshot = useCallback(() => itemsRef.current, []);

  /**
   * Sync the store to the correct source whenever auth state changes, and merge
   * any guest wishlist into the account on the guest→authenticated transition.
   *
   * Guests → localStorage (existing behavior). Authenticated → the entire
   * authenticated sync (guest merge + authoritative load) runs as ONE task on
   * the existing mutation queue so it can never race a concurrent add/remove —
   * mutations enqueued during the merge apply on top of the post-merge server
   * state, and the merge can never overwrite a newer user change.
   *
   * Merge (the safe sequence, never the reverse):
   *   read guest (localStorage) → GET account wishlist → POST only the missing
   *   productIds → GET authoritative account wishlist → apply to context →
   *   clear guest storage.
   *
   * Guest storage is the recovery mechanism: it is cleared ONLY when every
   * guest product is accounted for server-side. On any failure the guest list
   * is preserved, the authoritative account wishlist still loads, and the error
   * is exposed. There is no automatic retry loop — a later login re-attempts
   * the merge, and after a successful merge localStorage is empty so a refresh
   * has nothing to merge.
   *
   * Note: no guard skips re-running this on React StrictMode's dev-only mount
   * double-invocation; the `cancelled` flag discards the superseded run exactly
   * like CartContext, so the wishlist always loads on authenticated refresh.
   */
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (isAuthenticated) {
        setIsLoading(true);
        setError(null);
        try {
          await enqueue(async () => {
            // 1) Read the guest wishlist (never throws — [] on malformed/empty).
            const guestIds = [
              ...new Set(
                loadWishlist()
                  .map((item) => item?.id)
                  .filter((id) => id !== undefined && id !== null)
                  .map((id) => String(id))
              ),
            ];

            let allMerged = true;
            let mergeError = null;

            if (guestIds.length > 0) {
              // 2) Load the account wishlist and POST only the missing
              //    productIds — duplicates never create extra backend rows.
              const current = await fetchWishlist();
              const serverIds = new Set(
                (current || []).map((item) => String(item.productId))
              );
              const missing = guestIds.filter((id) => !serverIds.has(id));
              if (missing.length > 0) {
                await Promise.all(
                  missing.map((id) =>
                    addWishlistItem(Number(id)).catch((err) => {
                      allMerged = false;
                      mergeError = mergeError || err;
                    })
                  )
                );
              }
            }

            // 3) Authoritative account wishlist → context. The backend unique
            //    constraint (user_id, product_id) is the final dedupe layer.
            const serverItems = await fetchWishlist();
            if (cancelled) return;
            setItems((serverItems || []).map(toStoreItem).filter(Boolean));

            // 4) Clear guest storage only once everything is accounted for.
            if (allMerged) {
              clearStoredWishlist();
            }
            setError(allMerged ? null : errorMessage(mergeError));
          });
        } catch (err) {
          if (cancelled) return;
          setError(errorMessage(err));
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      } else {
        // Guests keep the localStorage wishlist as their source of truth.
        setItems(loadWishlist());
        setError(null);
        setIsLoading(false);
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, enqueue, setItems]);

  const isWishlisted = useCallback(
    (productId) => itemsRef.current.some((item) => sameId(item.id, productId)),
    []
  );

  const addToWishlist = useCallback(
    (product) => {
      const productId = product?.id;
      if (productId === undefined || productId === null) return;
      if (itemsRef.current.some((item) => sameId(item.id, productId))) return;

      setItems((prev) => [
        ...prev,
        {
          id: productId,
          productId,
          name: product.name || 'Untitled',
          price: Number(product.price) || 0,
          oldPrice: Number(product.oldPrice) || 0,
          imageUrl: product.imageUrl || '',
          category: product.category || '',
          stockQuantity: Number(product.stockQuantity) || 0,
          isActive: product.isActive !== false,
        },
      ]);

      // Guests are localStorage-only — nothing else to do.
      if (!authRef.current) return;

      enqueue(async () => {
        try {
          const serverItem = await addWishlistItem(productId);
          setError(null);
          // Backend is authoritative for the fields it returns; keep the
          // optimistic product's display-only fields.
          setItems((prev) =>
            prev.map((it) =>
              sameId(it.id, productId) ? applyServerItem(it, serverItem) : it
            )
          );
        } catch (err) {
          setError(errorMessage(err));
          // Rollback: restore the previous state.
          setItems((prev) => prev.filter((it) => !sameId(it.id, productId)));
        }
      });
    },
    [enqueue, setItems]
  );

  const removeFromWishlist = useCallback(
    (productId) => {
      if (productId === undefined || productId === null) return;
      const existing = itemsRef.current.find((item) => sameId(item.id, productId));
      if (!existing) return;

      setItems((prev) => prev.filter((item) => !sameId(item.id, productId)));

      // Guests are localStorage-only — nothing else to do.
      if (!authRef.current) return;

      enqueue(async () => {
        try {
          await removeWishlistItem(productId);
          setError(null);
        } catch (err) {
          setError(errorMessage(err));
          // Rollback: restore the removed entry.
          setItems((prev) =>
            prev.some((it) => sameId(it.id, productId)) ? prev : [...prev, existing]
          );
        }
      });
    },
    [enqueue, setItems]
  );

  const toggleWishlist = useCallback(
    (product) => {
      if (!product?.id) return;
      if (itemsRef.current.some((item) => sameId(item.id, product.id))) {
        removeFromWishlist(product.id);
      } else {
        addToWishlist(product);
      }
    },
    [addToWishlist, removeFromWishlist]
  );

  const clearWishlist = useCallback(() => {
    const current = itemsRef.current;
    setItems([]);

    // Guests are localStorage-only — nothing else to do.
    if (!authRef.current) return;

    const productIds = current.map((item) => item.id);
    if (productIds.length === 0) return;

    enqueue(async () => {
      try {
        await Promise.all(
          productIds.map((id) => removeWishlistItem(id).catch(() => null))
        );
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
        try {
          // Reconcile with the server so the UI reflects backend truth.
          const serverItems = await fetchWishlist();
          setItems((serverItems || []).map(toStoreItem).filter(Boolean));
        } catch {
          /* keep empty if reconcile also fails */
        }
      }
    });
  }, [enqueue, setItems]);

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
  const dataValue = useMemo(
    () => ({ items, count: items.length, isLoading, error }),
    [items, isLoading, error]
  );

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