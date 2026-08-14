import {
  registerCustomer,
  loginCustomer,
  getCurrentCustomer,
  requestPasswordReset,
  resetPassword as resetCustomerPassword,
} from '../services/customerAuth.service.js';

/**
 * Customer authentication HTTP handlers (Sprint 21.1).
 *
 * Controllers stay thin: parse the request, delegate to the service, and shape
 * the response. Errors thrown by the service (400/401/404/409) are forwarded
 * to the centralized errorHandler by the asyncHandler wrapper in the route
 * file.
 */

/** POST /api/customer/auth/register — create a customer account. */
export async function register(req, res) {
  const { token, user } = await registerCustomer(req.body);
  res.status(201).json({ success: true, token, user });
}

/** POST /api/customer/auth/login — authenticate a customer, issue a JWT. */
export async function login(req, res) {
  const { token, user } = await loginCustomer(req.body);
  res.json({ success: true, token, user });
}

/** GET /api/customer/auth/me — return the currently authenticated customer. */
export async function me(req, res) {
  const user = await getCurrentCustomer(req.user.id);
  res.json({ success: true, user });
}

/** POST /api/customer/auth/forgot-password — request a reset link. */
export async function forgotPassword(req, res) {
  const result = await requestPasswordReset(req.body);
  res.json({ success: true, ...result });
}

/** POST /api/customer/auth/reset-password — set a new password from a token. */
export async function resetPassword(req, res) {
  await resetCustomerPassword(req.body);
  res.json({ success: true, message: 'Your password has been updated. Please sign in.' });
}