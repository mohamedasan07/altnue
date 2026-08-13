import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authService from '../services/auth.service'
import { AuthContext } from './authContext'
import {
  getStoredToken,
  getStoredUser,
  setAuthStorage,
  clearAuthStorage,
} from '../utils/storage'

/**
 * Provides the global authentication state and actions for the admin app.
 *
 * On mount the previous session is restored synchronously from localStorage,
 * so a returning admin goes straight to their destination (no flash of the
 * login screen, no extra network request).
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate()

  const [token, setToken] = useState(() => getStoredToken())
  const [admin, setAdmin] = useState(() => getStoredUser())

  const isAuthenticated = Boolean(token)

  const login = useCallback(async (email, password) => {
    const { token: newToken, admin: newAdmin } = await authService.login(
      email,
      password,
    )
    setAuthStorage(newToken, newAdmin)
    setToken(newToken)
    setAdmin(newAdmin)
    return newAdmin
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    clearAuthStorage()
    setToken(null)
    setAdmin(null)
    navigate('/')
  }, [navigate])

  const value = { isAuthenticated, token, admin, login, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
