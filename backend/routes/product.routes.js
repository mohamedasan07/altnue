import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import {
  listProductsHandler,
  getProductHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
} from '../controllers/product.controller.js';

/**
 * Product routes (Sprint 19 — full CRUD on Supabase).
 *
 * Reads are public; writes are protected by JWT (authorize) so only an
 * authenticated admin can mutate the catalog. The admin frontend already sends
 * `Authorization: Bearer <token>` on every request via its Axios interceptor.
 *
 * Mounted at /api/products via routes/index.js.
 */
const router = Router();

router.get('/', asyncHandler(listProductsHandler));
router.get('/:id', asyncHandler(getProductHandler));

router.post('/', authorize('admin'), asyncHandler(createProductHandler));
router.put('/:id', authorize('admin'), asyncHandler(updateProductHandler));
router.delete('/:id', authorize('admin'), asyncHandler(deleteProductHandler));

export default router;
