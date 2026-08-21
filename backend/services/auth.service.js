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
 * Verify a candidate password against the configured admin credential.
 *
 * Sprint 22.6 P1: admin auth REQUIRES a bcrypt hash (ADMIN_PASSWORD_HASH).
 * There is deliberately NO plaintext fallback — if the hash is missing the
 * environment is misconfigured and we fail loudly (500) instead of silently
 * comparing a plaintext env value. An invalid/malformed hash simply never
 * matches (bcrypt.compareSync returns false → 401), which is a safe failure.
 */
function verifyPassword(candidate) {
  const { admin } = config.auth;

  if (!admin.passwordHash) {
    throw authError(
      500,
      'ADMIN_PASSWORD_HASH is not configured. Add a bcrypt hash of the admin password to the backend environment before enabling admin authentication.'
    );
  }

  return bcrypt.compareSync(candidate, admin.passwordHash);
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
