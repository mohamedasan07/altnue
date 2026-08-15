import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authService from '../services/auth.service'
import { setUnauthorizedHandler } from '../services/api'
import { useToast } from '../components/toast/useToast'
import { AuthContext, AUTH_STATUS, SESSION_EXPIRED_MESSAGE } from './authContext'
import {
  getStoredToken,
  setAuthStorage,
  clearAuthStorage,
} from '../utils/storage'

/**
 * Provides the global authentication state and actions for the admin app.
 *
 * Security model (production):
 *  - The dashboard is NEVER rendered on the mere presence of a token in
 *    localStorage. On startup any stored JWT is validated via GET /api/auth/me
 *    before the protected shell is allowed to mount.
 *  - The admin profile is always taken from the server (/me or login
 *    response) — the cached localStorage object is never displayed.
 *  - Every protected API 401 (expired/revoked/forged token) automatically
 *    tears the session down: storage cleared, admin state dropped, redirect
 *    to login, "Session expired. Please sign in again." shown.
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [status, setStatus] = useState(() =>
    getStoredToken() ? AUTH_STATUS.VALIDATING : AUTH_STATUS.UNAUTHENTICATED,
  )
  const [token, setToken] = useState(() => getStoredToken())
  const [admin, setAdmin] = useState(null)
  const [sessionMessage, setSessionMessage] = useState('')

  // Guards against duplicate teardown when both the Axios interceptor and the
  // startup-validation catch observe the same 401. Written synchronously so a
  // second call within the same tick is a no-op; reset on login/logout.
  const unauthorizedHandledRef = useRef(false)

  const handleUnauthorized = useCallback(
    (message = SESSION_EXPIRED_MESSAGE) => {
      if (unauthorizedHandledRef.current) return
      unauthorizedHandledRef.current = true
      clearAuthStorage()
      setToken(null)
      setAdmin(null)
      setStatus(AUTH_STATUS.UNAUTHENTICATED)
      setSessionMessage(message)
      showToast(message, 'error')
      navigate('/', { replace: true })
    },
    [navigate, showToast],
  )

  // Register the global 401 handler: any protected admin request that is
  // rejected with 401 triggers session teardown, so Products/Orders (and the
  // whole shell) can never remain visible after the JWT becomes invalid.
  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
    return () => setUnauthorizedHandler(null)
  }, [handleUnauthorized])

  // Validate a stored JWT on startup. Routes only render once this settles, so
  // a stale/expired token redirects to login instead of exposing the app.
  useEffect(() => {
    if (!getStoredToken()) return
    authService
      .getCurrentUser()
      .then((user) => {
        setAdmin(user)
        setStatus(AUTH_STATUS.AUTHENTICATED)
      })
      .catch(() => {
        // A 401 already ran handleUnauthorized via the interceptor; the guard
        // makes it idempotent, and non-401 failures (offline, 5xx) are still
        // treated as an unverifiable session.
        handleUnauthorized()
      })
  }, [handleUnauthorized])

  const login = useCallback(async (email, password) => {
    const { token: newToken, admin: newAdmin } = await authService.login(
      email,
      password,
    )
    unauthorizedHandledRef.current = false
    setAuthStorage(newToken, newAdmin)
    setToken(newToken)
    setAdmin(newAdmin)
    setStatus(AUTH_STATUS.AUTHENTICATED)
    setSessionMessage('')
    return newAdmin
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    unauthorizedHandledRef.current = false
    clearAuthStorage()
    setToken(null)
    setAdmin(null)
    setStatus(AUTH_STATUS.UNAUTHENTICATED)
    setSessionMessage('')
    navigate('/')
  }, [navigate])

  const clearSessionMessage = useCallback(() => {
    setSessionMessage('')
  }, [])

  const isAuthenticated = status === AUTH_STATUS.AUTHENTICATED

  const value = {
    isAuthenticated,
    status,
    token,
    admin,
    sessionMessage,
    clearSessionMessage,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}