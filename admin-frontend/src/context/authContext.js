import { createContext } from 'react'

/**
 * The auth context object, kept in its own file so the provider component and
 * the useAuth hook can both import it (and react-refresh stays happy).
 */
export const AuthContext = createContext(null)

/**
 * Lifecycle states for the admin session.
 *  - validating:      a stored token exists but has NOT yet been verified
 *                     against the backend — the app shell must not render.
 *  - authenticated:   the JWT was verified (startup /me, or a fresh login).
 *  - unauthenticated: no session (or the stored session was rejected).
 */
export const AUTH_STATUS = {
  VALIDATING: 'validating',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
}

export const SESSION_EXPIRED_MESSAGE = 'Session expired. Please sign in again.'