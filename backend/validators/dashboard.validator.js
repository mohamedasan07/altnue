import { ApiError } from '../utils/apiError.js';

/**
 * Admin dashboard validation (Sprint 22.2 Phase 1).
 *
 * Single source of truth for the dashboard query contract: the allowlisted
 * query params the aggregate + granular endpoints accept (limit / threshold /
 * months). Mirrors adminOrder.validator.js — anything unrecognized throws a
 * 400 with a combined, human-readable message, and every value is
 * range-bounded so it can never reach the database unvalidated.
 */

export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 50;
export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const MAX_LOW_STOCK_THRESHOLD = 1000;
export const DEFAULT_MONTHS = 6;
export const MAX_MONTHS = 24;

/**
 * Parse + validate the shared dashboard query string. Every endpoint receives
 * the same parsed object and uses only the fields it accepts.
 * @param {object} query  req.query
 * @returns {{ limit: number, threshold: number, months: number }}
 * @throws {ApiError} 400 when a value is invalid
 */
export function parseDashboardQuery(query = {}) {
  const errors = [];

  const limit = Number(query.limit ?? DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    errors.push(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  const threshold = Number(query.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD);
  if (
    !Number.isInteger(threshold) ||
    threshold < 1 ||
    threshold > MAX_LOW_STOCK_THRESHOLD
  ) {
    errors.push(`threshold must be an integer between 1 and ${MAX_LOW_STOCK_THRESHOLD}`);
  }

  const months = Number(query.months ?? DEFAULT_MONTHS);
  if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) {
    errors.push(`months must be an integer between 1 and ${MAX_MONTHS}`);
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('; '));
  }

  return { limit, threshold, months };
}