import api from './api'

/**
 * Admin dashboard API calls (Sprint 22.2 Phase 2).
 * Reuses the shared Axios instance (services/api.js) — no fetch() in
 * components, and the JWT is attached automatically by the interceptor.
 *
 * Backend endpoint consumed (exactly as it exists):
 *   GET /admin/dashboard -> aggregate payload for the dashboard page:
 *   { success, stats, salesOverview, recentOrders, lowStockProducts,
 *     recentActivity, bestSellers, latestCustomers }
 *
 * bestSellers / latestCustomers are returned by the aggregate but are not
 * rendered by the dashboard in Sprint 22.2 (they back a future Analytics /
 * Customers page). The payload is passed through untouched so callers decide.
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

const EMPTY_DASHBOARD = {
  stats: {},
  salesOverview: [],
  recentOrders: [],
  lowStockProducts: [],
  recentActivity: [],
  bestSellers: [],
  latestCustomers: [],
}

/** GET /admin/dashboard — full aggregate payload for the dashboard page. */
export async function getDashboard() {
  try {
    const { data } = await api.get('/admin/dashboard')
    return {
      ...EMPTY_DASHBOARD,
      ...(data || {}),
    }
  } catch (error) {
    throw normalizeError(error)
  }
}