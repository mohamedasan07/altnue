import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Admin authentication service — Sprint 15.
 *
 * Owns all auth business logic: credential validation, JWT creation and
 * verification. Controllers and middleware stay thin and delegate here.
 *
 * Errors thrown by this module carry `status` and `expose: true` so the
 * centralized errorHandler renders the intended status code + message.
 */

/** Build a typed error that the centralized errorHandler understands. */
export function authError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}

/**
 * Resolve the JWT signing secret.
 *
 * No hardcoded fallback: if JWT_SECRET is missing we fail loudly instead of
 * silently issuing unsigned tokens (a security footgun).
 */
export function getJwtSecret() {
  if (!config.auth.jwtSecret) {
    throw authError(
      500,
      'JWT_SECRET is not configured. Add JWT_SECRET to the backend .env file before enabling admin authentication.'
    );
  }
  return config.auth.jwtSecret;
}

/** Map the configured admin identity to the public admin profile shape. */
function buildAdminProfile() {
  const { admin } = config.auth;
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
}

/**
 * Verify a candidate password against the configured admin secret.
 *
 * Prefers a bcrypt hash (ADMIN_PASSWORD_HASH) — the production-grade path.
 * Falls back to the legacy plaintext ADMIN_PASSWORD so existing local/dev
 * environments keep working without first generating a hash.
 */
function verifyPassword(candidate) {
  const { admin } = config.auth;

  if (admin.passwordHash) {
    return bcrypt.compareSync(candidate, admin.passwordHash);
  }
  return candidate === admin.password;
}

/**
 * Authenticate an admin with email + password.
 *
 * @param {{ email?: string, password?: string }} credentials
 * @returns {Promise<{ token: string, admin: object }>}
 * @throws {Error} 400 when fields are missing, 401 on invalid credentials.
 */
export async function loginAdmin({ email, password } = {}) {
  const cleanEmail = String(email ?? '').trim();
  const cleanPassword = String(password ?? '');

  // Basic presence validation before any comparison work.
  if (!cleanEmail || !cleanPassword) {
    throw authError(400, 'Email and password are required');
  }

  // Constant-time-safe enough credential comparison — always validate against
  // the real admin profile so we never leak which field was wrong.
  const admin = buildAdminProfile();
  const emailMatches = cleanEmail === admin.email;
  const passwordMatches = verifyPassword(cleanPassword);

  if (!emailMatches || !passwordMatches) {
    throw authError(401, 'Invalid email or password');
  }

  // Sign a short-lived token carrying only non-sensitive admin claims.
  const token = jwt.sign(
    { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    getJwtSecret(),
    { expiresIn: config.auth.jwtExpiresIn }
  );

  return { token, admin };
}

/**
 * Verify a JWT and return its decoded admin claims.
 *
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {Error} 401 for malformed/expired tokens, 500 if JWT_SECRET unset.
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw authError(401, 'Session expired — please sign in again');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw authError(401, 'Invalid or malformed token');
    }
    throw err;
  }
}
