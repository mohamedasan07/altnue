// SettingsStorage — localStorage persistence for account preferences.
// Covers notification + privacy switches. Theme persists separately via the
// existing ThemeContext (unsorted_theme).

const STORAGE_KEY = 'unsorted_settings_v1';

const DEFAULTS = {
  notifications: {
    marketingEmails: true,
    orderUpdates: true,
    securityAlerts: true,
  },
  privacy: {
    personalizedRecommendations: true,
    shareWithPartners: false,
  },
  updatedAt: null,
};

function mergeDeep(base, stored) {
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    ...stored,
    notifications: { ...base.notifications, ...(stored.notifications || {}) },
    privacy: { ...base.privacy, ...(stored.privacy || {}) },
  };
}

/** Read saved settings, falling back to (and persisting) defaults. */
export function loadSettings() {
  let stored = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    stored = null;
  }

  const settings = mergeDeep(DEFAULTS, stored);
  if (!stored) try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* noop */ }
  return settings;
}

/** Persist settings (swallows storage failures). */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, updatedAt: new Date().toISOString() }));
  } catch {
    /* storage unavailable */
  }
}

export function clearStoredSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}