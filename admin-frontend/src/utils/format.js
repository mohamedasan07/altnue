/**
 * Shared display formatters (Sprint 22.1 Phase 3).
 *
 * Thin helpers used across the admin order UI. All values are defensive —
 * a missing timestamp or amount renders a placeholder instead of crashing.
 */

/** Format an amount as Indian Rupees, e.g. ₹1,23,456.50. */
export function formatMoney(amount) {
  const value = Number(amount) || 0
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

/** "15 Aug 2026" — or "—" when the value is missing/invalid. */
export function formatDate(value) {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** "15 Aug 2026, 10:58 AM" — or "—" when the value is missing/invalid. */
export function formatDateTime(value) {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** "3 items" / "1 item" / "0 items". */
export function formatCount(count) {
  const value = Number(count) || 0
  return `${value} ${value === 1 ? 'item' : 'items'}`
}

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}