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

/**
 * Resolve a product asset URL.
 * Products are served from Cloudinary, so absolute URLs (http/https,
 * protocol-relative or data URIs) pass through unchanged. There is no longer
 * any serveable local asset path to fall back to.
 */
export function resolveUrl(src = '') {
  if (!src) return '';
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
  return '';
}