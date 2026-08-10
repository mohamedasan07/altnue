import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Centralized error handler. Must stay mounted LAST and keep the 4-arg
 * signature so Express recognizes it as error middleware.
 */
export function errorHandler(err, req, res, _next) {
  logger.error(err?.stack || err);

  const status = err?.status || err?.statusCode || 500;
  const expose = Boolean(err?.expose);

  const payload = {
    error: expose ? err.message : 'Internal Server Error',
  };

  // Surface the underlying message in development to ease debugging.
  if (!config.isProduction && !expose) payload.detail = err.message;

  res.status(status).json(payload);
}