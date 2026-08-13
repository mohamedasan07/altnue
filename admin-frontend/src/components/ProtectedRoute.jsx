import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Route guard for the admin shell. Renders children when a session exists,
 * otherwise redirects to the login page.
 *
 * Usage (pathless route):
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<AdminLayout />}> ... </Route>
 *   </Route>
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children ?? <Outlet />
}

export default ProtectedRoute
