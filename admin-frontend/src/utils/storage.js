/**
 * Single owner of the admin auth localStorage keys. Both the Axios interceptor
 * (services/api.js) and AuthContext read/write through here so key names and
 * JSON parsing never drift apart.
 */
export const STORAGE_KEYS = {
  token: 'admin_token',
  user: 'admin_user',
}

export function getStoredToken() {
  return localStorage.getItem(STORAGE_KEYS.token) || null
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.user)) || null
  } catch {
    return null
  }
}

export function setAuthStorage(token, admin) {
  localStorage.setItem(STORAGE_KEYS.token, token)
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(admin))
}

export function clearAuthStorage() {
  localStorage.removeItem(STORAGE_KEYS.token)
  localStorage.removeItem(STORAGE_KEYS.user)
}
