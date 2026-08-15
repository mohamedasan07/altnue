/**
 * Order status vocabulary + labels (Sprint 22.1 Phase 3).
 *
 * Single source of truth for the admin order UI's display vocabulary. The
 * allowed values mirror the backend schema CHECK constraints and the
 * allowlists in backend/validators/adminOrder.validator.js — never invent a
 * status here.
 *
 * Each entry maps to a badge accent (module.css) and a filter option. The
 * timeline builder derives a read-only status progression from the current
 * order fields (placedAt / createdAt / updatedAt), since the backend stores
 * no per-transition audit history.
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

const FULFILMENT_STEPS = ['confirmed', 'processing', 'shipped', 'delivered']

/**
 * Build a read-only milestone timeline for an order.
 *
 * Milestones are derived from the order's current fields (no audit history is
 * stored), so each step is either done, active (the current status), or
 * upcoming. Dates use placedAt for the placed milestone and updatedAt for the
 * active step — the only timestamps the backend exposes.
 *
 * @param {object} order  normalized admin order
 * @returns {Array<{ id: string, label: string, date: string|null, state: string }>}
 */
export function buildOrderTimeline(order) {
  if (!order) return []

  const steps =
    order.status === 'cancelled'
      ? ['cancelled']
      : FULFILMENT_STEPS.slice(0, FULFILMENT_STEPS.indexOf(order.status) + 1)

  const milestones = [
    {
      id: 'placed',
      label: 'Order Placed',
      date: order.placedAt || null,
      state: 'done',
    },
    {
      id: 'payment',
      label: getPaymentStatusMeta(order.paymentStatus).label,
      date: order.paymentStatus !== 'pending' ? order.updatedAt || null : null,
      state: order.paymentStatus === 'pending' ? 'active' : 'done',
    },
    ...steps.map((step) => ({
      id: step,
      label: getOrderStatusMeta(step).label,
      date: step === order.status ? order.updatedAt || null : null,
      state: step === order.status ? 'active' : 'done',
    })),
  ]

  return milestones
}