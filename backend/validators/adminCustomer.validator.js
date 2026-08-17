import { ApiError } from '../utils/apiError.js';

/**
 * Admin customer validation (Sprint 22.3 Phase 1).
 *
 * Single source of truth for the admin customer contract: the query params the
 * admin frontend may send on the list and detail endpoints. Mirrors
 * adminOrder.validator.js — anything unrecognized throws a 400 with a combined,
 * human-readable message instead of being silently ignored.
 *
 * Every value that reaches the repository is allowlisted here (sort columns,
 * status filters, asc/desc), so nothing user-controlled can be interpolated
 * into a query.
 */

export const CUSTOMER_SORTS = [
  'created_at',
  'last_login_at',
  'first_name',
  'email',
  'role',
];

export const CUSTOMER_STATUS_FILTERS = ['active', 'inactive'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_SEARCH_LENGTH = 64;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_ORDER_LIMIT = 10;

/**
 * Parse + validate the admin customer list query string.
 * @param {object} query  req.query
 * @returns {{
 *   page: number,
 *   limit: number,
 *   search: string|null,
 *   isActive: boolean|null,
 *   sort: 'created_at'|'last_login_at'|'first_name'|'email'|'role',
 *   order: 'asc'|'desc',
 * }}
 * @throws {ApiError} 400 when a value is invalid
 */
export function parseAdminCustomerQuery(query = {}) {
  const errors = [];

  const page = Number(query.page ?? DEFAULT_PAGE);
  if (!Number.isInteger(page) || page < 1) {
    errors.push('page must be a positive integer');
  }

  const limit = Number(query.limit ?? DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    errors.push(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  const search = String(query.search ?? '').trim().slice(0, MAX_SEARCH_LENGTH);

  const status = String(query.status ?? '').trim();
  let isActive = null;
  if (status) {
    if (!CUSTOMER_STATUS_FILTERS.includes(status)) {
      errors.push(`status must be one of: ${CUSTOMER_STATUS_FILTERS.join(', ')}`);
    } else {
      isActive = status === 'active';
    }
  }

  const sort = String(query.sort ?? 'created_at').trim();
  if (!CUSTOMER_SORTS.includes(sort)) {
    errors.push(`sort must be one of: ${CUSTOMER_SORTS.join(', ')}`);
  }

  const order = String(query.order ?? 'desc').trim().toLowerCase();
  if (order !== 'asc' && order !== 'desc') {
    errors.push('order must be "asc" or "desc"');
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return {
    page,
    limit,
    search: search || null,
    isActive,
    sort,
    order,
  };
}

/**
 * Parse + validate the pagination params for a customer's order list inside
 * the detail endpoint (defaults to a smaller page size than the customer list).
 * @param {object} query  req.query
 * @returns {{ page: number, limit: number }}
 * @throws {ApiError} 400 when a value is invalid
 */
export function parseCustomerOrdersQuery(query = {}) {
  const errors = [];

  const page = Number(query.page ?? DEFAULT_PAGE);
  if (!Number.isInteger(page) || page < 1) {
    errors.push('page must be a positive integer');
  }

  const limit = Number(query.limit ?? DEFAULT_ORDER_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    errors.push(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return { page, limit };
}

/**
 * Validate a customer id (UUID) path param before it reaches the database.
 * @param {string} value
 * @returns {string} the trimmed id
 * @throws {ApiError} 400 when invalid
 */
export function parseCustomerId(value) {
  const id = String(value ?? '').trim();
  if (!UUID_RE.test(id)) {
    throw new ApiError(400, 'Invalid customer id');
  }
  return id;
}