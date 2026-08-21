import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import {
  getProfileHandler,
  updateProfileHandler,
} from '../controllers/user.controller.js';

/**
 * Customer profile routes (Sprint 21.2).
 * Mounted at /api/customer via routes/index.js.
 *
 *   GET /api/customer/profile  — protected (role: customer)
 *   PUT /api/customer/profile  — protected (role: customer)
 */
const router = Router();

router.get('/profile', authorize('customer'), asyncHandler(getProfileHandler));
router.put('/profile', authorize('customer'), asyncHandler(updateProfileHandler));

export default router;