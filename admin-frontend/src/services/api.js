import axios from 'axios'
import { getStoredToken } from '../utils/storage'

/**
 * Shared Axios instance for the admin frontend.
 *
 * baseURL is read from VITE_API_URL (see .env) — never hardcoded. Every
 * request automatically carries the admin JWT via a request interceptor, so
 * individual services never attach headers themselves.
 */
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

export default api
