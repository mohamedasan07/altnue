// API client — single fetch wrapper + asset URL resolution.

const REMOTE_BASE = 'https://unsorted-backend.onrender.com';

const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

// In development, API calls go through the Vite dev proxy (same origin), so the
// browser never performs a CORS cross-origin request regardless of the Vite
// port. Vite's server.proxy then forwards /api to localhost:3001.
// In production, fall back to the deployed backend URL.
export const API_BASE = isDev ? '' : REMOTE_BASE;

export async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }

  return res.json();
}

// Local product assets were migrated to Cloudinary (Sprint 14A). The public id
// of each asset is the original filename with image extensions stripped and
// slugified, e.g. "/images/tshirt_1.jpeg" -> "tshirt_1". Bucketing them under
// the same URL scheme lets us mine stale snapshots (persisted wishlist/cart
// entries saved before the migration) without the local folder.
const CLOUDINARY_ASSET_ROOT = 'https://res.cloudinary.com/jtfzpgol/image/upload/unsorted/products';
const LEGACY_IMAGE_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.avif', '.svg', '.bmp', '.jfif', '.pjpeg', '.pjp'];

function coreImageName(value) {
  let name = String(value || '').trim();
  let previous;
  do {
    previous = name;
    const lower = name.toLowerCase();
    for (const ext of LEGACY_IMAGE_EXTENSIONS) {
      if (lower.endsWith(ext)) {
        name = name.slice(0, -ext.length);
        break;
      }
    }
  } while (name !== previous);
  return name;
}

function migrateLegacyImageUrl(src) {
  const basename = coreImageName(String(src || '').split(/[\\/]/).pop() || '');
  const publicId = basename.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!publicId) return '';
  return `${CLOUDINARY_ASSET_ROOT}/${publicId}.jpg`;
}

/**
 * Resolve a product asset URL.
 * Cloudinary URLs (http/https, protocol-relative or data URIs) pass through
 * unchanged. Anything else is treated as a legacy local asset path and mapped
 * to its Cloudinary equivalent; unrecognized values resolve to ''.
 */
export function resolveUrl(src = '') {
  if (!src) return '';
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
  return migrateLegacyImageUrl(src);
}