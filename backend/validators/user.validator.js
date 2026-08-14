import { ApiError } from '../utils/apiError.js';

/**
 * Customer payload validation (Sprint 21.1).
 *
 * Single source of truth for the fields the customer auth module accepts:
 *   register: firstName, lastName, email, password, phone (optional)
 *   login:    email, password
 *
 * Used by the controller before it calls the service. Throws ApiError(400)
 * with a combined, human-readable message when the payload is invalid.
 */

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const PHONE_MAX = 20;
// bcrypt truncates input at 72 BYTES — enforcing this prevents two different
// long passwords from silently colliding to the same hash.
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function byteLength(value) {
  return Buffer.byteLength(value, 'utf8');
}

function isValidEmail(value) {
  return EMAIL_RE.test(value);
}

/**
 * Normalize a raw email for storage/comparison: trim + lowercase. citext in
 * the DB already makes uniqueness case-insensitive; lowering here keeps the
 * comparison consistent with what we store.
 */
export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Validate a register payload and return a normalized DB-safe object.
 *
 * @param {object} body  request body
 * @returns {object} normalized payload { firstName, lastName, email, password, phone? }
 * @throws {ApiError} 400 when validation fails
 */
export function validateRegisterPayload(body = {}) {
  const errors = [];
  const data = {};

  // --- firstName ---
  const firstName = String(body.firstName ?? '').trim();
  if (!firstName) {
    errors.push('firstName is required');
  } else if (firstName.length > NAME_MAX) {
    errors.push(`firstName must be ${NAME_MAX} characters or fewer`);
  } else {
    data.firstName = firstName;
  }

  // --- lastName ---
  const lastName = String(body.lastName ?? '').trim();
  if (!lastName) {
    errors.push('lastName is required');
  } else if (lastName.length > NAME_MAX) {
    errors.push(`lastName must be ${NAME_MAX} characters or fewer`);
  } else {
    data.lastName = lastName;
  }

  // --- email ---
  const email = normalizeEmail(body.email);
  if (!email) {
    errors.push('email is required');
  } else if (email.length > EMAIL_MAX) {
    errors.push(`email must be ${EMAIL_MAX} characters or fewer`);
  } else if (!isValidEmail(email)) {
    errors.push('email must be a valid email address');
  } else {
    data.email = email;
  }

  // --- password ---
  if (!isPresent(body.password)) {
    errors.push('password is required');
  } else {
    const password = String(body.password);
    if (password.length < PASSWORD_MIN) {
      errors.push(`password must be at least ${PASSWORD_MIN} characters`);
    } else if (byteLength(password) > PASSWORD_MAX_BYTES) {
      errors.push(`password must be ${PASSWORD_MAX_BYTES} bytes or fewer`);
    } else {
      data.password = password;
    }
  }

  // --- phone (optional) ---
  if (isPresent(body.phone)) {
    const phone = String(body.phone).trim();
    if (phone.length > PHONE_MAX) {
      errors.push(`phone must be ${PHONE_MAX} characters or fewer`);
    } else {
      data.phone = phone;
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return data;
}

/**
 * Validate a login payload (presence only). Credential correctness is the
 * service's job — login must return a uniform 401 for any mismatch.
 *
 * @param {object} body  request body
 * @returns {object} normalized payload { email, password }
 * @throws {ApiError} 400 when fields are missing
 */
export function validateLoginPayload(body = {}) {
  const errors = [];

  const email = normalizeEmail(body.email);
  if (!email) errors.push('email is required');

  const password = isPresent(body.password) ? String(body.password) : '';
  if (!password) errors.push('password is required');

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return { email, password };
}

/**
 * Validate a forgot-password request (email only). Always succeeds at the
 * service level for unknown emails so the endpoint cannot be used to probe
 * which addresses are registered.
 *
 * @param {object} body  request body
 * @returns {object} normalized payload { email }
 * @throws {ApiError} 400 when the email is missing/malformed
 */
export function validateResetRequestPayload(body = {}) {
  const email = normalizeEmail(body.email);
  if (!email) throw new ApiError(400, 'email is required');
  if (email.length > EMAIL_MAX) throw new ApiError(400, `email must be ${EMAIL_MAX} characters or fewer`);
  if (!isValidEmail(email)) throw new ApiError(400, 'email must be a valid email address');
  return { email };
}

/**
 * Validate a reset-password payload: the one-time token + new password.
 *
 * @param {object} body  request body
 * @returns {object} normalized payload { token, password }
 * @throws {ApiError} 400 when fields are missing or the password is weak
 */
export function validateResetConfirmPayload(body = {}) {
  const errors = [];
  let password = '';

  const token = isPresent(body.token) ? String(body.token) : '';
  if (!token) errors.push('token is required');

  if (!isPresent(body.password)) {
    errors.push('password is required');
  } else {
    const candidate = String(body.password);
    if (candidate.length < PASSWORD_MIN) {
      errors.push(`password must be at least ${PASSWORD_MIN} characters`);
    } else if (byteLength(candidate) > PASSWORD_MAX_BYTES) {
      errors.push(`password must be ${PASSWORD_MAX_BYTES} bytes or fewer`);
    } else {
      password = candidate;
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return { token, password };
}