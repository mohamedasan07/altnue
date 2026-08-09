// WishlistStorage — localStorage persistence for saved products.

const STORAGE_KEY = 'unsorted_wishlist_v1';

function isValid(saved) {
  return (
    saved &&
    typeof saved === 'object' &&
    saved.id !== undefined &&
    saved.id !== null &&
    typeof saved.name === 'string'
  );
}

/** Read persisted wishlist. Never throws — returns [] on any fault. */
export function loadWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid);
  } catch {
    return [];
  }
}

/** Persist the current wishlist. Swallows storage failures. */
export function saveWishlist(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — wishlist runs in memory only */
  }
}

export function clearStoredWishlist() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}