import api from './api'

/**
 * Product API calls (Sprint 18).
 * Reuses the shared Axios instance (services/api.js) — no fetch() in components.
 *
 * Backend endpoints consumed (exactly as they exist):
 *   GET    /admin/products   → array of ALL products (active + hidden) — admin only
 *   POST   /products         → { ok, product }
 *   PUT    /products/:id     → { ok, product }  (partial update supported)
 *   DELETE /products/:id     → { ok }
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

/**
 * GET /admin/products — full catalog (active + hidden) for the admin UI.
 * JWT is attached automatically by the shared axios interceptor, so admins
 * see hidden (is_active = false) products that the public catalog omits.
 */
export async function listProducts() {
  try {
    const { data } = await api.get('/admin/products')
    return Array.isArray(data) ? data : []
  } catch (error) {
    throw normalizeError(error)
  }
}

/** POST /products — create. Resolves to the persisted product. */
export async function createProduct(payload) {
  try {
    const { data } = await api.post('/products', payload)
    return data?.product ?? data
  } catch (error) {
    throw normalizeError(error)
  }
}

/** PUT /products/:id — update. Resolves to the persisted product. */
export async function updateProduct(id, payload) {
  try {
    const { data } = await api.put(`/products/${id}`, payload)
    return data?.product ?? data
  } catch (error) {
    throw normalizeError(error)
  }
}

/** DELETE /products/:id — remove. */
export async function deleteProduct(id) {
  try {
    const { data } = await api.delete(`/products/${id}`)
    return data
  } catch (error) {
    throw normalizeError(error)
  }
}
