import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import {
  listOrdersHandler,
  getOrderHandler,
  createOrderHandler,
  cancelOrderHandler,
} from '../controllers/order.controller.js';

/**
 * Order routes (Sprint 21.3 Phase 3, Sprint 22.5 Phase 2 cancellation).
 * Mounted at /api/customer/orders via routes/index.js. All routes are
 * customer-authenticated; every row is scoped to req.user.id in the service.
 *
 *   POST   /            — place an order from the active cart
 *   GET    /            — list the customer's order history
 *   GET    /:id         — a single order with its items
 *   PATCH  /:id/cancel  — cancel an own, cancellable order (restores stock)
 */
const router = Router();

router.use(authorize('customer'));

router.post('/', asyncHandler(createOrderHandler));
router.get('/', asyncHandler(listOrdersHandler));
router.get('/:id', asyncHandler(getOrderHandler));
router.patch('/:id/cancel', asyncHandler(cancelOrderHandler));

export default router;