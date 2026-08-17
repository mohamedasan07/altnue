import api from './api'

/**
 * Admin customer API calls (Sprint 22.3 Phase 2).
 * Reuses the shared Axios instance (services/api.js) — no fetch() in
 * components, and the JWT is attached automatically by the interceptor.
 *
 * Backend endpoints consumed (exactly as they exist):
 *   GET /admin/customers   → { success, customers, pagination { page, limit, total, totalPages } }
 *   GET /admin/customers/:id → { success, profile, stats, addresses, orders { items, pagination }, activity }
 *
 * The list is server-side (page / limit / search / status / sort / order) and
 * the detail accepts page / limit for the customer's order sub-list — both
 * mirroring backend/validators/adminCustomer.validator.js.
 */

function normalizeError(error) {
  if (error.response) {
    const { status, data } = error.response
    if (status >= 500) return new Error('Server error. Please try again.')
    return new Error(data?.error || 'Something went wrong. Please try again.')
  }
  if (error.request) return new Error('Unable to connect to server')
  return new Error('Something went wrong. Please try again.')
}

const EMPTY_PAGINATION = { page: 1, limit: 10, total: 0, totalPages: 1 }

/**
 * GET /admin/customers — paginated, filtered, sorted customer list.
 * Undefined params are dropped by axios, so "all" filters are omitted.
 * @param {{ page?: number, limit?: number, search?: string, status?: string,
 *           sort?: string, order?: string }} params
 * @returns {Promise<{ customers: Array, pagination: object }>}
 */
export async function listCustomers(params = {}) {
  try {
    const { data } = await api.get('/admin/customers', { params })
    return {
      customers: Array.isArray(data?.customers) ? data.customers : [],
      pagination: data?.pagination || EMPTY_PAGINATION,
    }
  } catch (error) {
    throw normalizeError(error)
  }
}

/**
 * GET /admin/customers/:id — profile, stats, addresses, orders + activity.
 * `params` supports page / limit for the customer's order sub-list.
 * A 404 is preserved (err.status = 404) so the drawer can render a distinct
 * not-found state.
 * @param {string} id
 * @param {{ page?: number, limit?: number }} [params]
 * @returns {Promise<object>} the detail payload ({ profile, stats, addresses, orders, activity })
 */
export async function getCustomer(id, params = {}) {
  try {
    const { data } = await api.get(`/admin/customers/${id}`, { params })
    return data
  } catch (error) {
    if (error.response?.status === 404) {
      const notFound = new Error('Customer not found')
      notFound.status = 404
      throw notFound
    }
    throw normalizeError(error)
  }
}