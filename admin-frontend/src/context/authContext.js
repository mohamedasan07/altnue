import { createContext } from 'react'

/**
 * The auth context object, kept in its own file so the provider component and
 * the useAuth hook can both import it (and react-refresh stays happy).
 */
export const AuthContext = createContext(null)
