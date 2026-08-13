import { useContext } from 'react'
import { AuthContext } from '../context/authContext'

/**
 * Access the auth context. Must be used within <AuthProvider>.
 * Lives in hooks/ so the context file stays a pure component export
 * (react-refresh compatible).
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
