import { verifyToken, authError } from '../services/auth.service.js';

/**
 * Shared authentication + authorization middleware (Sprint 19B final,
 * extended Sprint 21.1 for customer tokens).
 *
 * Three exported pieces:
 *   authorize('admin', 'manager', ...)  — reusable role guard
 *   verifyAdmin()                       — backward-compatible alias
 *   authenticate(req)                   — low-level token verification
 *
 * All expect: Authorization: Bearer <token>. On success they attach the
 * decoded profile to the request:
 *   req.admin  — admin tokens (Sprint 15, unchanged)
 *   req.user   — customer tokens (Sprint 21.1, new)
 * so existing admin handlers that read `req.admin` keep working untouched,
 * while new customer handlers read `req.user`. All failures are forwarded to
 * the centralized errorHandler via next(err).
 */

/** Decode + verify the Bearer token, then attach the safe claims. */
function authenticate(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!header || scheme?.toLowerCase() !== 'bearer' || !token) {
    throw authError(401, 'Authentication required — provide a Bearer token');
  }

  const payload = verifyToken(token);

  // Attach only the non-sensitive claims the rest of the app may rely on.
  // Admin tokens keep the exact shape Sprint 15 established (req.admin);
  // customer tokens land on req.user so the two role families never collide.
  if (payload.role === 'admin') {
    req.admin = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } else {
    req.user = {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      role: payload.role ?? 'customer',
    };
  }

  return payload.role === 'admin' ? req.admin : req.user;
}

/**
 * Reusable authorization middleware: authorize(...roles).
 *
 * Verifies the JWT and then requires the decoded principal's role to be one of
 * the given roles. Calling authorize() with no roles only authenticates (any
 * valid token passes). Behavior for existing admin routes is unchanged.
 *
 * Example:
 *   router.post('/', authorize('admin'), handler)            // admin only
 *   router.get('/me', authorize('customer'), handler)        // customer only
 *   router.put('/:id', authorize('admin', 'customer'), handler)
 */
export function authorize(...roles) {
  const allowedRoles = roles.filter(Boolean);

  return function authorizeMiddleware(req, _res, next) {
    try {
      const principal = authenticate(req);

      if (allowedRoles.length > 0 && !allowedRoles.includes(principal.role)) {
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