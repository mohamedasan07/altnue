import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Centralized error handler. Must stay mounted LAST and keep the 4-arg
 * signature so Express recognizes it as error middleware.
 */
export function errorHandler(err, req, res, _next) {
  const status = err?.status || err?.statusCode || 500;

  // Expected client errors (400/401/403/404/409) log at warn level — they are
  // normal traffic, not incidents. Stack traces are only useful for real
  // server failures (>= 500).
  if (status >= 500) {
    logger.error(err?.stack || err);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${status} (${err?.message || 'request failed'})`);
  }

  const expose = Boolean(err?.expose);

  const payload = {
    error: expose ? err.message : 'Internal Server Error',
  };

  // Surface the underlying message in development to ease debugging.
  if (!config.isProduction && !expose) payload.detail = err.message;

  res.status(status).json(payload);
}