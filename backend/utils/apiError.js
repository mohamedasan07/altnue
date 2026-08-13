/**
 * Typed HTTP error understood by the centralized errorHandler.
 *
 * Carries `status` (HTTP status code) and `expose: true` so the message is
 * rendered in the JSON response body instead of the generic 500 fallback.
 * Thrown by services/validators and forwarded by the asyncHandler wrapper.
 */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.expose = true;
  }
}
