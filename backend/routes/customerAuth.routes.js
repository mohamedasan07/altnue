import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
} from '../controllers/customerAuth.controller.js';

/**
 * Customer authentication routes (Sprint 21.1).
 * Mounted at /api/customer/auth via routes/index.js.
 *
 *   POST /register         — public, creates a customer account
 *   POST /login            — public, issues a customer JWT
 *   GET  /me               — protected (role: customer)
 *   POST /forgot-password  — public, mints a one-time reset link
 *   POST /reset-password   — public, sets a new password from a token
 */
const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', authorize('customer'), me);
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));

export default router;