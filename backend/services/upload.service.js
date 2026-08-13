import { getCloudinary } from '../cloudinary/client.js';
import { config } from '../config/index.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

/**
 * Image upload service (Sprint 20).
 *
 * Owns the file → Cloudinary pipeline: validates the uploaded image (type +
 * size) and streams it to Cloudinary, returning the secure URL. Credentials
 * never leave the server — they live only in the backend config.
 */

// Supported formats — mirrors the admin <input accept>.
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function uploadStreamToCloudinary(cloudinary, buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        overwrite: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.on('error', reject);
    stream.end(buffer);
  });
}

/**
 * Upload an uploaded image file to Cloudinary.
 *
 * @param {{ buffer: Buffer, mimetype?: string, size?: number }} file  the
 *   multer-parsed file (in-memory buffer).
 * @returns {Promise<{ secureUrl: string, publicId: string }>}
 * @throws {ApiError} 400 bad type, 413 too large, 503 when Cloudinary is not
 *   configured or the upload fails.
 */
export async function uploadImage(file) {
  if (!file) {
    throw new ApiError(400, 'No image provided');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new ApiError(400, 'Unsupported image type — use JPG, PNG or WEBP');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ApiError(413, 'Image must be 5 MB or smaller');
  }

  const cloudinary = getCloudinary();
  if (!cloudinary) {
    throw new ApiError(503, 'Image uploads are temporarily unavailable');
  }

  let result;
  try {
    result = await uploadStreamToCloudinary(
      cloudinary,
      file.buffer,
      config.cloudinary.uploadFolder
    );
  } catch (err) {
    logger.error('[upload] Cloudinary upload failed:', err);
    throw new ApiError(500, 'Image upload failed. Please try again.');
  }

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
  };
}