import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  findUserByEmail,
  loadSession,
  loadUsers,
  publicUser,
  saveSession,
  saveUsers,
  clearSession,
} from '../services/authStorage';
import { normalizeEmail } from '../utils/authValidation';

const AuthContext = createContext(null);

// Fake latency so buttons show a believable loading state in the UI.
const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

const makeError = (field, message) => {
  const err = new Error(message);
  err.field = field;
  return err;
};

/** Build a fresh session object for a persisted user. */
function sessionFor(user, remember) {
  return { userId: user.id, email: user.email, loggedInAt: Date.now(), remember: Boolean(remember) };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const session = loadSession();
    if (!session) return null;
    const users = loadUsers();
    const account = findUserByEmail(users, session.email ?? session.userId);
    return account ? publicUser(account) : null;
  });

  const login = useCallback(async ({ email, password, remember = true } = {}) => {
    await delay();
    const normalized = normalizeEmail(email);
    const users = loadUsers();
    const account = findUserByEmail(users, normalized);

    if (!account) {
      throw makeError('email', 'No account found with this email.');
    }
    if (account.password !== password) {
      throw makeError('password', 'Incorrect password.');
    }

    const session = sessionFor(account, remember);
    if (remember) saveSession(session);
    setUser(publicUser(account));
    return publicUser(account);
  }, []);

  const register = useCallback(async (details = {}) => {
    await delay(650);
    const users = loadUsers();
    const normalized = normalizeEmail(details.email);

    if (findUserByEmail(users, normalized)) {
      throw makeError('email', 'An account with this email already exists.');
    }

    const account = {
      id: `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      firstName: (details.firstName || '').trim(),
      lastName: (details.lastName || '').trim(),
      email: normalized,
      phone: (details.phone || '').trim(),
      password: details.password,
      address: details.address ?? '',
      createdAt: new Date().toISOString(),
    };

    saveUsers([...users, account]);
    saveSession(sessionFor(account, true));
    setUser(publicUser(account));
    return publicUser(account);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const updateProfile = useCallback((patch = {}) => {
    setUser((current) => {
      if (!current) return current;
      const merged = { ...current, ...patch };
      const users = loadUsers();
      const nextUsers = users.map((u) => (u.id === current.id ? { ...u, ...merged } : u));
      saveUsers(nextUsers);
      const session = loadSession();
      if (session) saveSession(sessionFor({ ...merged, id: current.id }, session.remember));
      return merged;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}