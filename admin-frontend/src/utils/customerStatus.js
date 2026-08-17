/**
 * Customer status vocabulary + labels (Sprint 22.3 Phase 2).
 *
 * Single source of truth for the admin customer UI's display vocabulary. The
 * allowed values mirror the backend's derived status (is_active → active /
 * inactive) and the allowlist in backend/validators/adminCustomer.validator.js
 * — never invent a status here.
 *
 * Each entry maps to a badge accent (module.css) and a filter option.
 */

export const CUSTOMER_STATUS_META = {
  active: { label: 'Active', accent: 'success' },
  inactive: { label: 'Inactive', accent: 'secondary' },
}

export const CUSTOMER_STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  ...Object.entries(CUSTOMER_STATUS_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
]

/** Sortable columns the backend accepts (backend/validators/adminCustomer.validator.js). */
export const CUSTOMER_SORTS = [
  { value: 'created_at', label: 'Joined' },
  { value: 'last_login_at', label: 'Last Login' },
  { value: 'first_name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'role', label: 'Role' },
]

export function getCustomerStatusMeta(status) {
  return (
    CUSTOMER_STATUS_META[status] || { label: String(status || '—'), accent: 'secondary' }
  )
}