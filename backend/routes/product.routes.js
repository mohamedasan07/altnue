import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listProductsHandler, getProductHandler } from '../controllers/product.controller.js';

/**
 * Public product catalog (read-only, Sprint 13B). Reads come from Supabase via
 * the product service/repository. Admin CRUD stays in the legacy server.js
 * routes for now (out of scope for this sprint).
 */
const router = Router();

router.get('/', asyncHandler(listProductsHandler));
router.get('/:id', asyncHandler(getProductHandler));

export default router;