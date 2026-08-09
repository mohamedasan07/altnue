// UNSORTED — cart persistence layer.

const STORAGE_KEY = 'unsorted_cart_v1';

function isValidLine(line) {
  return (
    line &&
    typeof line === 'object' &&
    typeof line.id === 'string' &&
    typeof line.productId !== 'undefined' &&
    Number.isFinite(Number(line.price))
  );
}

/** Hydrate cart items from localStorage. Never throws — returns [] on any fault. */
export function loadCartItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidLine);
  } catch {
    return [];
  }
}

/** Persist the current cart. Swallows storage failures so the UI never breaks. */
export function saveCartItems(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — cart runs in memory only */
  }
}

export function clearStoredCart() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}