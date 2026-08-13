import api from './api'

/**
 * Image upload API call (Sprint 20).
 *
 * POST /api/upload — multipart/form-data. The admin JWT is attached
 * automatically by the shared axios interceptor (services/api.js), and the
 * FormData content-type is set there so the browser can add the boundary.
 * Cloudinary credentials never reach the browser — the backend returns only
 * the secure URL.
 */
function normalizeError(error) {
  if (error.response) {
    const { status, data } = error.response
    if (status >= 500) {
      return new Error('Upload failed — server error. Please try again.')
    }
    return new Error(data?.error || 'Upload failed. Please try again.')
  }
  if (error.request) {
    return new Error('Unable to connect to server')
  }
  return new Error('Upload failed. Please try again.')
}
export async function uploadImage(file, onProgress) {
  const formData = new FormData()
  formData.append('image', file)

  try {
    const { data } = await api.post('/upload', formData, {
      onUploadProgress: (event) => {
        if (typeof onProgress === 'function' && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      },
    })
    return data?.secureUrl
  } catch (error) {
    throw normalizeError(error)
  }
}