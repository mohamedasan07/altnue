import { verifyToken, authError } from '../services/auth.service.js';

/**
 * Shared authentication + authorization middleware (Sprint 19B final).
 *
 * Two exported pieces:
 *   authorize('admin', 'manager', ...)  — reusable role guard
 *   verifyAdmin()                       — backward-compatible alias
 *
 * Both expect: Authorization: Bearer <token>. On success they attach the
 * decoded admin profile to `req.admin` so handlers (e.g. GET /api/auth/me)
 * never re-verify. All failures are forwarded to the centralized errorHandler
 * via next(err).
 */

/** Decode + verify the Bearer token, then attach the safe claims to req.admin. */
function authenticate(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!header || scheme?.toLowerCase() !== 'bearer' || !token) {
    throw authError(401, 'Authentication required — provide a Bearer token');
  }

  const payload = verifyToken(token);

  // Attach only the non-sensitive claims the rest of the app may rely on.
  req.admin = {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    role: payload.role,
  };

  return req.admin;
}

/**
 * Reusable authorization middleware: authorize(...roles).
 *
 * Verifies the JWT and then requires `req.admin.role` to be one of the given
 * roles. Calling authorize() with no roles only authenticates (any valid admin
 * passes).
 *
 * Example:
 *   router.post('/', authorize('admin'), handler)      // admin only
 *   router.put('/:id', authorize('admin', 'manager'), handler)
 */
export function authorize(...roles) {
  const allowedRoles = roles.filter(Boolean);

  return function authorizeMiddleware(req, _res, next) {
    try {
      const admin = authenticate(req);

      if (allowedRoles.length > 0 && !allowedRoles.includes(admin.role)) {
        throw authError(403, 'Forbidden — insufficient permissions');
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Backward-compatible admin guard. Internally reuses authorize('admin'), so an
 * authenticated account with role "admin" keeps working exactly as before and
 * the whole codebase shares one authorization path.
 */
export function verifyAdmin(req, res, next) {
  return authorize('admin')(req, res, next);
}