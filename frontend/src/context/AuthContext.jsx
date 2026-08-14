import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../services/customerAuth';
import {
  getStoredToken,
  getStoredUser,
  setAuthStorage,
  clearAuthStorage,
} from '../services/authStorage';
import { UNAUTHORIZED_EVENT } from '../services/api';
import { normalizeEmail } from '../utils/authValidation';

const AuthContext = createContext(null);

/**
 * Customer authentication (Sprint 21.1 backend, wired here in 21.2).
 *
 * The public API is intentionally identical to the previous localStorage mock
 * so every consumer (LoginForm, RegisterForm, ForgotPasswordForm,
 * ProtectedRoute, ProfileDropdown, ProfileCard, SettingsPanel) works without
 * change:
 *   { user, isAuthenticated, login, register, logout, updateProfile }
 *
 * Sessions persist as a JWT + profile in localStorage. A 401 from any API call
 * clears the stored session centrally (services/api.js) and fires
 * UNAUTHORIZED_EVENT, which this provider listens for to drop the in-memory
 * user.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());

  // Centralized 401 → logout: any customer API call that returns 401 clears
  // the stored session and signs the user out in every open tab.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // Session restore — refresh the cached profile from the backend so profile
  // edits made elsewhere are picked up after a refresh.
  useEffect(() => {
    let cancelled = false;
    async function refreshSession() {
      if (!getStoredToken()) return;
      try {
        const fresh = await authApi.fetchCurrentCustomer();
        if (cancelled) return;
        setAuthStorage(getStoredToken(), fresh);
        setUser(fresh);
      } catch {
        // 401 is handled centrally; network errors keep the cached profile.
      }
    }
    refreshSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async ({ email, password } = {}) => {
    const { token, user: account } = await authApi.loginCustomer({
      email: normalizeEmail(email),
      password,
    });
    setAuthStorage(token, account);
    setUser(account);
    return account;
  }, []);

  const register = useCallback(async (details = {}) => {
    const { token, user: account } = await authApi.registerCustomer({
      firstName: details.firstName,
      lastName: details.lastName,
      email: normalizeEmail(details.email),
      phone: details.phone,
      password: details.password,
    });
    setAuthStorage(token, account);
    setUser(account);
    return account;
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch = {}) => {
    const { token, user: account } = await authApi.updateCustomerProfile(patch);
    setAuthStorage(token, account);
    setUser(account);
    return account;
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