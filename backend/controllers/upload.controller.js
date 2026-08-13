import { uploadImage } from '../services/upload.service.js';

/**
 * Upload HTTP handler (Sprint 20).
 *
 * POST /api/upload — admin-only (JWT). Receives a single `image` file field
 * parsed by the multer middleware, delegates to the upload service, and
 * returns the Cloudinary secure URL. Thin: no file logic lives here.
 */
export async function uploadImageHandler(req, res) {
  const { secureUrl, publicId } = await uploadImage(req.file);
  res.json({ ok: true, secureUrl, publicId });
}