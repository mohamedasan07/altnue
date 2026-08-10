/**
 * Wraps an async route/controller handler so rejected promises are forwarded
 * to Express' error-handling middleware instead of crashing the process.
 *
 * @param {Function} fn async (req, res, next) handler
 * @returns {Function} Express middleware
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);