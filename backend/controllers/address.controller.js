import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../services/address.service.js';

/**
 * Address book HTTP handlers (Sprint 21.2).
 * Controllers stay thin: parse the request, delegate to the service, shape the
 * response. Errors thrown by the service (400/404/409/500) are forwarded to
 * the centralized errorHandler by the asyncHandler wrapper in the route file.
 */

/** GET /api/customer/addresses — the current customer's address book. */
export async function listAddressesHandler(req, res) {
  const addresses = await listAddresses(req.user.id);
  res.json({ success: true, addresses });
}

/** POST /api/customer/addresses — create a new address. */
export async function createAddressHandler(req, res) {
  const address = await createAddress(req.user.id, req.body);
  res.status(201).json({ success: true, address });
}

/** PUT /api/customer/addresses/:id — update an address (default promotion). */
export async function updateAddressHandler(req, res) {
  const address = await updateAddress(req.user.id, req.params.id, req.body);
  res.json({ success: true, address });
}

/** DELETE /api/customer/addresses/:id — remove an address. */
export async function deleteAddressHandler(req, res) {
  const result = await deleteAddress(req.user.id, req.params.id);
  res.json({ success: true, ...result });
}