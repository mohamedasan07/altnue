// API client — single fetch wrapper + asset URL resolution.

const REMOTE_BASE = 'https://unsorted-backend.onrender.com';

export const API_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : REMOTE_BASE;

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
  return `${API_BASE}/${String(src).replace(/^\/+/, '')}`;
}