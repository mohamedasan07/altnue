// UNSORTED — customer auth persistence.
// Stores the customer JWT + profile in localStorage so sessions survive
// refreshes. The token is read by services/api.js to attach the Bearer header
// on every API request; a 401 there clears storage centrally.

const TOKEN_KEY = 'unsorted_customer_token';
const USER_KEY = 'unsorted_customer_user';

/** Read the stored customer JWT. Never throws — null on any fault. */
export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

/** Read the cached customer profile. Never throws — null on any fault. */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Persist the token + profile (swallows storage failures). */
export function setAuthStorage(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable — session runs in memory only */
  }
}

/** Remove the token + profile. */
export function clearAuthStorage() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
}