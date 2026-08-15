import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import {
  getDashboardHandler,
  getDashboardStatsHandler,
  getSalesOverviewHandler,
  getRecentOrdersHandler,
  getLowStockProductsHandler,
  getBestSellersHandler,
  getLatestCustomersHandler,
  getRecentActivityHandler,
} from '../controllers/dashboard.controller.js';

/**
 * Admin dashboard routes (Sprint 22.2 Phase 1).
 * Mounted at /api/admin/dashboard via routes/index.js. Every route is
 * admin-authenticated (authorize('admin')), so only accounts with role
 * "admin" can read dashboard metrics.
 *
 *   GET /                — full aggregate payload for the dashboard page
 *   GET /stats           — stat cards + monthly sales overview
 *   GET /sales           — monthly sales trend (zero-filled)
 *   GET /recent-orders   — newest orders with items
 *   GET /low-stock       — active products at/below a stock threshold
 *   GET /best-sellers    — top products by units sold
 *   GET /customers       — newest customer accounts
 *   GET /activity        — derived recent-activity feed
 */
const router = Router();

router.use(authorize('admin'));

router.get('/', asyncHandler(getDashboardHandler));
router.get('/stats', asyncHandler(getDashboardStatsHandler));
router.get('/sales', asyncHandler(getSalesOverviewHandler));
router.get('/recent-orders', asyncHandler(getRecentOrdersHandler));
router.get('/low-stock', asyncHandler(getLowStockProductsHandler));
router.get('/best-sellers', asyncHandler(getBestSellersHandler));
router.get('/customers', asyncHandler(getLatestCustomersHandler));
router.get('/activity', asyncHandler(getRecentActivityHandler));

export default router;