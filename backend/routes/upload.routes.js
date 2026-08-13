import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authorize } from '../middleware/auth.middleware.js';
import { ApiError } from '../utils/apiError.js';
import { MAX_FILE_SIZE } from '../services/upload.service.js';
import { uploadImageHandler } from '../controllers/upload.controller.js';

/**
 * Image upload routes (Sprint 20).
 *
 * POST /api/upload — protected by JWT so only an authenticated admin can
 * upload. Files are buffered in memory (no temp files on disk) and handed to
 * the upload service, which streams them to Cloudinary. Cloudinary credentials
 * never leave the backend.
 */
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

// Multer errors are plain Error objects — translate them into ApiErrors so the
// centralized errorHandler returns a clean, exposed JSON message.
function singleImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, 'Image must be 5 MB or smaller'));
    }
    return next(new ApiError(400, 'Failed to read the uploaded image'));
  });
}

router.post('/', authorize('admin'), singleImage, asyncHandler(uploadImageHandler));

export default router;