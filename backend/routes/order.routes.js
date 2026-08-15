import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import {
  listOrdersHandler,
  getOrderHandler,
  createOrderHandler,
} from '../controllers/order.controller.js';

/**
 * Order routes (Sprint 21.3 Phase 3).
 * Mounted at /api/customer/orders via routes/index.js. All routes are
 * customer-authenticated; every row is scoped to req.user.id in the service.
 *
 *   POST   /                 — place an order from the active cart
 *   GET    /                 — list the customer's order history
 *   GET    /:id              — a single order with its items
 */
const router = Router();

router.use(authorize('customer'));

router.post('/', asyncHandler(createOrderHandler));
router.get('/', listOrdersHandler);
router.get('/:id', asyncHandler(getOrderHandler));

export default router;