import { createContext } from 'react'

/**
 * The toast context object, kept in its own file so the provider component and
 * the useToast hook can both import it (react-refresh friendly).
 */
export const ToastContext = createContext(null)
