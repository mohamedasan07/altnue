import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import {
  listAddressesHandler,
  createAddressHandler,
  updateAddressHandler,
  deleteAddressHandler,
} from '../controllers/address.controller.js';

/**
 * Customer address book routes (Sprint 21.2).
 * Mounted at /api/customer/addresses via routes/index.js. All routes are
 * customer-authenticated; every row is scoped to req.user.id in the service.
 *
 *   GET    /                 — list the customer's addresses
 *   POST   /                 — create an address
 *   PUT    /:id              — update an address (set-default handled here)
 *   DELETE /:id              — remove an address
 */
const router = Router();

router.use(authorize('customer'));

router.get('/', asyncHandler(listAddressesHandler));
router.post('/', asyncHandler(createAddressHandler));
router.put('/:id', asyncHandler(updateAddressHandler));
router.delete('/:id', asyncHandler(deleteAddressHandler));

export default router;