import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import { login, me } from '../controllers/auth.controller.js';

/**
 * Admin authentication routes (Sprint 15).
 * Mounted at /api/auth via routes/index.js.
 */
const router = Router();

// POST /api/auth/login — public, issues a JWT on valid credentials.
router.post('/login', asyncHandler(login));

// GET /api/auth/me — protected. Lets the admin frontend restore a session from
// a stored token.
router.get('/me', authorize('admin'), me);

export default router;
