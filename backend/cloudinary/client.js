import cloudinary from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let configured = false;

/**
 * Reusable Cloudinary client — configured once from the central config and
 * cached. Returns null when the environment is not configured so callers can
 * degrade gracefully during local development.
 *
 * Usage: `const cloudinary = getCloudinary(); await cloudinary.uploader.upload(...)`
 */
export function getCloudinary() {
  if (!config.cloudinary.configured) {
    logger.warn('Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env');
    return null;
  }

  if (!configured) {
    cloudinary.v2.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
    logger.info('Cloudinary client configured');
  }

  return cloudinary.v2;
}