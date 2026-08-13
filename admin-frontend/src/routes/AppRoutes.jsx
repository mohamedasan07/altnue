import { Routes, Route } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import ProtectedRoute from '../components/ProtectedRoute'
import LoginPage from '../pages/Login/LoginPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import ProductsPage from '../pages/Products/ProductsPage'
import OrdersPage from '../pages/Orders/OrdersPage'
import CustomersPage from '../pages/Customers/CustomersPage'
import AnalyticsPage from '../pages/Analytics/AnalyticsPage'
import SettingsPage from '../pages/Settings/SettingsPage'

function NotFoundPage() {
  return <h1>Page not found</h1>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      {/* All admin pages are wrapped in ProtectedRoute (auth required). */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
