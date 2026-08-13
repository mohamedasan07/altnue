import { useEffect, useRef, useState } from 'react'
import { FiImage, FiRefreshCw } from 'react-icons/fi'
import classNames from '../../utils/classNames'
import { uploadImage } from '../../services/upload.service'
import styles from './ImageUploader.module.css'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

/**
 * Product image uploader (Sprint 20).
 *
 * Replaces the Image URL text field. Clicking the image box opens the Windows
 * file picker via a hidden <input type="file">. The chosen image is previewed
 * instantly (object URL) and then uploaded automatically to POST /api/upload.
 * The returned Cloudinary secure URL is handed to `onChange`, so the product
 * form stores a real hosted URL without asking the admin to paste one.
 */
function ImageUploader({
  value = '',
  onChange,
  error,
  disabled = false,
  onUploadingChange,
}) {
  const inputRef = useRef(null)
  const clearTimerRef = useRef(null)

  const [preview, setPreview] = useState(value)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [notice, setNotice] = useState(null) // { kind: 'error' | 'success', text }

  useEffect(() => () => clearTimeout(clearTimerRef.current), [])

  const notifyUploading = (isUploading) => {
    onUploadingChange?.(isUploading)
  }

  const showNotice = (kind, text, autoClear = false) => {
    clearTimeout(clearTimerRef.current)
    setNotice({ kind, text })
    if (autoClear) {
      clearTimerRef.current = setTimeout(() => setNotice(null), 3000)
    }
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    // Reset so picking the same file again re-triggers change.
    event.target.value = ''

    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      showNotice('error', 'Unsupported file type — choose JPG, PNG or WEBP.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      showNotice('error', 'File is too large — maximum size is 5 MB.')
      return
    }

    setNotice(null)
    setUploading(true)
    notifyUploading(true)
    setProgress(0)

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    try {
      const secureUrl = await uploadImage(file, (pct) => setProgress(pct))
      URL.revokeObjectURL(objectUrl)
      setPreview(secureUrl)
      onChange(secureUrl)
      showNotice('success', 'Image uploaded successfully', true)
    } catch (err) {
      URL.revokeObjectURL(objectUrl)
      setPreview(value)
      showNotice('error', err.message)
    } finally {
      setUploading(false)
      notifyUploading(false)
    }
  }

  const openPicker = () => {
    if (!disabled && !uploading) inputRef.current?.click()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={classNames(
          styles.dropzone,
          error && styles.hasError,
          disabled && styles.disabled,
        )}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        disabled={disabled || uploading}
        aria-label="Upload product image"
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt=""
              className={styles.preview}
              data-testid="image-preview"
            />
            <span className={styles.overlay} aria-hidden="true">
              <FiRefreshCw size={16} />
              <span>Replace</span>
            </span>
          </>
        ) : (
          <span className={styles.placeholder}>
            <FiImage size={28} aria-hidden="true" />
            <span className={styles.placeholderTitle}>
              Click to upload product image
            </span>
            <span className={styles.placeholderHint}>
              JPG, PNG or WEBP · up to 5 MB
            </span>
          </span>
        )}

        {uploading && (
          <span className={styles.progressWrap} aria-hidden="true">
            <span
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.input}
        onChange={handleFileChange}
        disabled={disabled || uploading}
        tabIndex={-1}
        aria-hidden="true"
      />

      {uploading && (
        <p className={styles.uploading} role="status" aria-live="polite">
          Uploading… {progress}%
        </p>
      )}

      {notice?.kind === 'success' && !uploading && (
        <p className={styles.success} role="status" aria-live="polite">
          {notice.text}
        </p>
      )}

      {notice?.kind === 'error' && !uploading && (
        <p className={styles.error} role="alert">
          {notice.text}
        </p>
      )}

      {error && !notice && (
        <span className={styles.fieldError}>{error}</span>
      )}
    </div>
  )
}

export default ImageUploader