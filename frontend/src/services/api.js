// API client — single fetch wrapper + asset URL resolution.

const REMOTE_BASE = 'https://unsorted-backend.onrender.com';
const DEV_BASE = 'http://localhost:3001';

const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

// In development, API calls go through the Vite dev proxy (same origin), so the
// browser never performs a CORS cross-origin request regardless of the Vite
// port. Vite's server.proxy then forwards /api to DEV_BASE (localhost:3001).
// In production, fall back to the deployed backend URL.
export const API_BASE = isDev ? '' : REMOTE_BASE;

// <img> tags are not blocked by CORS, so non-/images/ asset filenames can still
// resolve straight against the backend during development.
const ASSET_BASE = isDev ? DEV_BASE : REMOTE_BASE;

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
 * Resolve a product asset URL for the current environment.
 * - absolute / protocol-relative / data URIs pass through
 * - /images/* passes through (dev proxy / deployed rewrites handle it)
 * - anything else resolves against the API base (backend static/images)
 */
export function resolveUrl(src = '') {
  if (!src) return '';
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
  if (src.startsWith('/images/')) return src;
  return `${ASSET_BASE}/${String(src).replace(/^\/+/, '')}`;
}