import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import {
  customerLoginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
} from '../middleware/rateLimit.middleware.js';
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
 *
 * Public endpoints are rate-limited per IP (Sprint 22.6 P1): register and
 * forgot-password use a 60-minute window (limits account spam and reset-link
 * minting without leaking account existence — the server still returns the
 * same safe response), login uses a 15-minute window. /me and /reset-password
 * are intentionally not limited (reset requires a single-use token).
 */
const router = Router();

router.post('/register', registerLimiter, asyncHandler(register));
router.post('/login', customerLoginLimiter, asyncHandler(login));
// asyncHandler is REQUIRED here: getCurrentCustomer can reject (deleted
// account, DB failure) and an unwrapped rejection crashes the process.
router.get('/me', authorize('customer'), asyncHandler(me));
router.post('/forgot-password', forgotPasswordLimiter, asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));

export default router;