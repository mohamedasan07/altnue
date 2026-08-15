import axios from 'axios'
import { getStoredToken } from '../utils/storage'

/**
 * Shared Axios instance for the admin frontend.
 *
 * baseURL is read from VITE_API_URL (see .env) — never hardcoded. Every
 * request automatically carries the admin JWT via a request interceptor, so
 * individual services never attach headers themselves.
 *
 * A response interceptor provides global 401 handling: any protected admin
 * endpoint that rejects the JWT (expired, revoked, forged) triggers an
 * automatic session teardown through the handler registered by AuthProvider.
 * The login endpoint is excluded — a failed sign-in is a form error, not a
 * session-expiry event.
 */

// Handler set by AuthProvider on mount. Kept outside the instance so multiple
// consumers can register/unregister without creating axios instances.
let onUnauthorizedHandler = null

/**
 * Register the callback invoked whenever an authenticated admin request is
 * rejected with 401. Pass null to unregister (e.g. on provider unmount).
 */
export function setUnauthorizedHandler(handler) {
  onUnauthorizedHandler = handler
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      // Marks the request as authenticated so the response interceptor can
      // distinguish "session expired" 401s from login-credential 401s.
      config._hasAuth = true
    }
    // For multipart uploads the browser must set the boundary — drop the
    // JSON content type so axios generates the correct multipart header.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const carriedToken = Boolean(error?.config?._hasAuth)
    if (status === 401 && carriedToken && onUnauthorizedHandler) {
      onUnauthorizedHandler()
    }
    return Promise.reject(error)
  },
)

export default api