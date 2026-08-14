import { getProfile, updateProfile } from '../services/user.service.js';

/**
 * Customer profile HTTP handlers (Sprint 21.2).
 * Controllers stay thin: parse the request, delegate to the service, shape the
 * response. Errors thrown by the service (400/404/500) are forwarded to the
 * centralized errorHandler by the asyncHandler wrapper in the route file.
 */

/** GET /api/customer/profile — return the currently authenticated customer. */
export async function getProfileHandler(req, res) {
  const user = await getProfile(req.user.id);
  res.json({ success: true, user });
}

/** PUT /api/customer/profile — update editable profile fields. */
export async function updateProfileHandler(req, res) {
  const { token, user } = await updateProfile(req.user.id, req.body);
  res.json({ success: true, token, user });
}