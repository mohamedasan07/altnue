import {
  getDashboard,
  getDashboardStats,
  getSalesOverview,
  getRecentOrders,
  getLowStockProducts,
  getBestSellers,
  getLatestCustomers,
  getRecentActivity,
} from '../services/dashboard.service.js';

/**
 * Admin dashboard HTTP handlers (Sprint 22.2 Phase 1).
 * Controllers stay thin: parse the request, delegate to the service, shape the
 * response. Errors thrown by the service (400/500) are forwarded to the
 * centralized errorHandler by the asyncHandler wrapper in the route file.
 */

/** GET /api/admin/dashboard — full aggregate payload for the dashboard page. */
export async function getDashboardHandler(req, res) {
  const data = await getDashboard();
  res.json({ success: true, ...data });
}

/** GET /api/admin/dashboard/stats — stat cards + monthly sales overview. */
export async function getDashboardStatsHandler(req, res) {
  const { stats, salesOverview } = await getDashboardStats();
  res.json({ success: true, stats, salesOverview });
}

/** GET /api/admin/dashboard/sales — monthly sales trend. */
export async function getSalesOverviewHandler(req, res) {
  const { salesOverview } = await getSalesOverview(req.query);
  res.json({ success: true, salesOverview });
}

/** GET /api/admin/dashboard/recent-orders — newest orders with items. */
export async function getRecentOrdersHandler(req, res) {
  const { recentOrders } = await getRecentOrders(req.query);
  res.json({ success: true, recentOrders });
}

/** GET /api/admin/dashboard/low-stock — active products at/below threshold. */
export async function getLowStockProductsHandler(req, res) {
  const { lowStockProducts } = await getLowStockProducts(req.query);
  res.json({ success: true, lowStockProducts });
}

/** GET /api/admin/dashboard/best-sellers — top products by units sold. */
export async function getBestSellersHandler(req, res) {
  const { bestSellers } = await getBestSellers(req.query);
  res.json({ success: true, bestSellers });
}

/** GET /api/admin/dashboard/customers — newest customer accounts. */
export async function getLatestCustomersHandler(req, res) {
  const { latestCustomers } = await getLatestCustomers(req.query);
  res.json({ success: true, latestCustomers });
}

/** GET /api/admin/dashboard/activity — derived recent-activity feed. */
export async function getRecentActivityHandler(req, res) {
  const { recentActivity } = await getRecentActivity();
  res.json({ success: true, recentActivity });
}