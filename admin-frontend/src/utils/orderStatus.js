/**
 * Order status vocabulary + labels (Sprint 22.1 Phase 3).
 *
 * Single source of truth for the admin order UI's display vocabulary. The
 * allowed values mirror the backend schema CHECK constraints and the
 * allowlists in backend/validators/adminOrder.validator.js — never invent a
 * status here.
 *
 * Each entry maps to a badge accent (module.css) and a filter option. The
 * timeline builder (Sprint 22.5 Phase 5) consumes the real order_status_history
 * rows the backend attaches as `order.history` — never derives a progression
 * from the current status.
 */

export const ORDER_STATUS_META = {
  pending: { label: 'Pending', accent: 'warning' },
  confirmed: { label: 'Confirmed', accent: 'info' },
  processing: { label: 'Processing', accent: 'info' },
  shipped: { label: 'Shipped', accent: 'secondary' },
  delivered: { label: 'Delivered', accent: 'success' },
  cancelled: { label: 'Cancelled', accent: 'danger' },
  refunded: { label: 'Refunded', accent: 'purple' },
}

export const PAYMENT_STATUS_META = {
  pending: { label: 'Payment Pending', accent: 'warning' },
  paid: { label: 'Paid', accent: 'success' },
  failed: { label: 'Payment Failed', accent: 'danger' },
  refunded: { label: 'Refunded', accent: 'purple' },
}

export const ORDER_STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  ...Object.entries(ORDER_STATUS_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
]

export const PAYMENT_STATUS_FILTERS = [
  { value: 'all', label: 'All Payments' },
  ...Object.entries(PAYMENT_STATUS_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
]

/** Sortable columns the backend accepts (backend/validators/adminOrder.validator.js). */
export const ORDER_SORTS = [
  { value: 'placed_at', label: 'Placed' },
  { value: 'order_number', label: 'Order' },
  { value: 'grand_total', label: 'Total' },
  { value: 'status', label: 'Status' },
]

export function getOrderStatusMeta(status) {
  return ORDER_STATUS_META[status] || { label: String(status || '—'), accent: 'info' }
}

const PAYMENT_METHOD_LABELS = {
  cod: 'Cash on Delivery',
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
}

/** Humanize a payment method value, e.g. "cod" → "Cash on Delivery". */
export function formatPaymentMethod(method) {
  return PAYMENT_METHOD_LABELS[method] || String(method || '—')
}

export function getPaymentStatusMeta(status) {
  return PAYMENT_STATUS_META[status] || { label: String(status || '—'), accent: 'info' }
}

const ACTOR_LABELS = {
  system: 'System',
  customer: 'Customer',
  admin: 'Admin',
}

/** Humanize a history actor role, with a neutral fallback for unknown roles. */
export function formatActor(role) {
  return ACTOR_LABELS[role] || 'System'
}

/**
 * Build the order timeline from real order_status_history rows.
 *
 * Each entry is an actual recorded transition ({ status, by, at }, oldest
 * first, attached as `order.history` by the backend admin detail endpoint):
 * the status label comes from the order-status metadata and the actor +
 * timestamp come straight from the history row — nothing is derived from the
 * current status or invented.
 *
 * Defensive fallback: when no history is available a single step shows only
 * the current status with no invented timestamp or actor.
 *
 * @param {object} order  normalized admin order
 * @returns {Array<{ id: string, label: string, date: string|null, actor: string|null, state: string }>}
 */
export function buildOrderTimeline(order) {
  if (!order) return []

  const history =
    Array.isArray(order.history) && order.history.length > 0
      ? order.history
      : null

  if (!history) {
    return [
      {
        id: 'current',
        label: getOrderStatusMeta(order.status).label,
        date: null,
        actor: null,
        state: 'done',
      },
    ]
  }

  return history.map((entry, i) => ({
    id: `${entry.status}-${i}`,
    label: getOrderStatusMeta(entry.status).label,
    date: entry.at || null,
    actor: entry.by || null,
    state: 'done',
  }))
}