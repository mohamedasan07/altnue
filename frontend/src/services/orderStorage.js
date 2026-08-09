// OrderStorage — persistence for placed orders.
// The original single "last order" record powers the order-success page;
// Sprint 12 adds a full order HISTORY list (with demo seed data) for the
// account dashboard. Frontend-only placeholder data.

const STORAGE_KEY = 'unsorted_last_order_v1';
const HISTORY_KEY = 'unsorted_orders_v1';

/* ------------------------------------------------------------------ *
 *  Last order (used by the order success page after checkout)
 * ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ *
 *  Order history (account dashboard)
 * ------------------------------------------------------------------ */

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n) {
  return new Date(Date.now() - n * DAY).toISOString();
}

function line(id, name, price, qty, size, color, colorName) {
  return {
    id,
    productId: id,
    name,
    category: 'Streetwear',
    price,
    oldPrice: 0,
    size,
    color,
    colorName,
    imageUrl: '',
    stockQuantity: 0,
    quantity: qty,
  };
}

function withTotals(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const shipping = order.delivery.id === 'express' ? 199 : 0;
  const discount = order.coupon ? Math.min(subtotal, Math.round(subtotal * order.coupon.percent)) : 0;
  return {
    ...order,
    totals: {
      count,
      subtotal,
      discount,
      shipping,
      tax: 0,
      taxable: subtotal - discount,
      grandTotal: subtotal - discount + shipping,
    },
  };
}

const AVA_SHIPPING = {
  name: 'Ava Kane',
  phone: '+91 98765 43210',
  email: 'ava@unsorted.com',
  line1: 'Flat 402, Lotus Residency',
  line2: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  country: 'India',
};

// Demo data — gives a first-login account a real-looking dashboard until
// actual checkouts accumulate.
const SEED_ORDERS = [
  {
    orderNumber: 'US-2608123456',
    placedAt: daysAgo(44),
    status: 'delivered',
    items: [
      line('mock_hoodie', 'Oversized Heavy Hoodie', 2499, 1, 'L', 'stone', 'Stone'),
      line('mock_cargo', 'Relaxed Cargo Pant', 3299, 1, '32', 'olive', 'Olive'),
    ],
    shipping: AVA_SHIPPING,
    delivery: { id: 'standard', label: 'Standard Delivery', note: 'Doorstep · 5–7 business days' },
    payment: 'upi',
    coupon: null,
    notes: '',
  },
  {
    orderNumber: 'US-2608110293',
    placedAt: daysAgo(9),
    status: 'processing',
    items: [line('mock_tee', 'Heavyweight Essential Tee', 1499, 1, 'M', 'black', 'Black')],
    shipping: AVA_SHIPPING,
    delivery: { id: 'express', label: 'Express Delivery', note: 'Priority — arrives first' },
    payment: 'card',
    coupon: { code: 'WELCOME10', percent: 0.1 },
    notes: 'Leave with reception.',
  },
  {
    orderNumber: 'US-2609097741',
    placedAt: daysAgo(2),
    status: 'cancelled',
    items: [line('mock_shell', 'Technical Shell Jacket', 7499, 1, 'XL', 'ash', 'Ash')],
    shipping: {
      ...AVA_SHIPPING,
      line1: '14, Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400002',
    },
    delivery: { id: 'express', label: 'Express Delivery', note: 'Priority — arrives first' },
    payment: 'cod',
    coupon: null,
    notes: '',
  },
];

const MOCK_ORDERS = SEED_ORDERS.map(withTotals);

/** Read the full order history, seeding demo orders on first access. */
export function loadOrders() {
  let list = [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed.filter((o) => o && typeof o === 'object' && o.orderNumber);
    }
  } catch {
    list = [];
  }

  // Merge a just-placed checkout order into history if it isn't there yet.
  const last = loadOrder();
  if (last && !list.some((o) => o.orderNumber === last.orderNumber)) {
    list = [last, ...list];
  }

  // Seed demo orders for a premium first-run experience.
  if (list.length === 0) {
    list = MOCK_ORDERS;
  }

  persist(list);
  return list;
}

/** Persist the full order history list (swallows storage failures). */
export function saveOrderHistory(list = []) {
  persist(list);
}

function persist(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — runs in memory only */
  }
}

export function clearOrderHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* noop */
  }
}