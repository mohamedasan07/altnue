// OrderStorage — persists the placed order so the success page can render
// it after the checkout page unmounts. Frontend-only placeholder data.

const STORAGE_KEY = 'unsorted_last_order_v1';

/** Read the last placed order. Returns null when unavailable. */
export function loadOrder() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.orderNumber ? parsed : null;
  } catch {
    return null;
  }
}

export function saveOrder(order) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* storage unavailable */
  }
}

export function clearOrder() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}