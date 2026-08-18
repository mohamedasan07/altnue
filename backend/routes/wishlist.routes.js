import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import {
  listWishlistHandler,
  addWishlistItemHandler,
  removeWishlistItemHandler,
} from '../controllers/wishlist.controller.js';

/**
 * Wishlist routes (Sprint 22.4 Phase 1).
 * Mounted at /api/customer/wishlist via routes/index.js. All routes are
 * customer-authenticated (`authorize('customer')` at the router level, same as
 * order.routes.js); every row is scoped to req.user.id in the service and
 * repository.
 *
 *   GET    /               — the customer's saved items
 *   POST   /               — add a product (idempotent)
 *   DELETE /:productId     — remove a product (idempotent)
 */
const router = Router();

router.use(authorize('customer'));

router.get('/', listWishlistHandler);
router.post('/', asyncHandler(addWishlistItemHandler));
router.delete('/:productId', asyncHandler(removeWishlistItemHandler));

export default router;
