// UNSORTED — mock auth persistence layer.
// Users and active sessions live in localStorage so login survives refreshes.
// Being a frontend-only mock, the stored password is plain text — never do
// this in production.

const USERS_KEY = 'unsorted_auth_users_v1';
const SESSION_KEY = 'unsorted_auth_session_v1';

function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

/** Read the registered-user registry. Never throws — returns [] on any fault. */
export function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u) => u && typeof u === 'object' && typeof u.email === 'string' && typeof u.password === 'string');
  } catch {
    return [];
  }
}

/** Persist the user registry. Swallows storage failures. */
export function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* storage unavailable — auth runs in memory only */
  }
}

export function clearStoredUsers() {
  try {
    localStorage.removeItem(USERS_KEY);
  } catch {
    /* noop */
  }
}

/** Find a registered account by email (case-insensitive). */
export function findUserByEmail(users, email) {
  const needle = String(email || '').trim().toLowerCase();
  return users.find((u) => String(u.email).trim().toLowerCase() === needle) ?? null;
}

/** Read the persisted session (remembered logins). Never throws — null on fault. */
export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.userId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist the current session (remember-me logins only). */
export function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable */
  }
}

/** Remove the persisted session. */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export { publicUser };