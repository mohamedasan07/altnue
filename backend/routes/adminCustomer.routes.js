import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import {
  listCustomersHandler,
  getCustomerHandler,
} from '../controllers/adminCustomer.controller.js';

/**
 * Admin customer routes (Sprint 22.3 Phase 1).
 * Mounted at /api/admin/customers via routes/index.js. Every route is
 * admin-authenticated (authorize('admin')), so only accounts with role
 * "admin" can read customer data. Read-only by design — no write endpoints.
 *
 *   GET /        — paginated customer list (search / filter / sort)
 *   GET /:id     — one customer's profile, stats, addresses, orders, activity
 */
const router = Router();

router.use(authorize('admin'));

router.get('/', asyncHandler(listCustomersHandler));
router.get('/:id', asyncHandler(getCustomerHandler));

export default router;