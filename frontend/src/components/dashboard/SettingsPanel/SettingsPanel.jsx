import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { loadSettings, saveSettings } from '../../../services/settingsStorage';
import AuthField from '../../auth/AuthField/AuthField';
import DashboardCard from '../DashboardCard/DashboardCard';
import styles from './SettingsPanel.module.css';

/**
 * Account settings — personal info (AuthContext), notification + privacy
 * switches and a theme selector (ThemeContext). Preferences persist locally.
 */
export default function SettingsPanel() {
  const { user, updateProfile } = useAuth();

  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Notification + privacy prefs, hydrated once from storage.
  const [prefs, setPrefs] = useState(() => loadSettings());

  useEffect(() => {
    setProfile({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
    });
  }, [user]);

  const setPref = (group, key) => (enabled) => {
    const next = { ...prefs, [group]: { ...prefs[group], [key]: enabled } };
    setPrefs(next);
    saveSettings(next);
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileError('');
    try {
      await updateProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        phone: profile.phone.trim() || null,
      });
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2200);
    } catch (err) {
      setProfileError(err.message || 'Unable to save your profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className={styles.stack}>
      <DashboardCard kicker="Identity" title="Personal information">
        <div className={styles.personalGrid}>
          <AuthField
            id="settings-first-name"
            label="First Name"
            type="text"
            value={profile.firstName}
            onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
          />
          <AuthField
            id="settings-last-name"
            label="Last Name"
            type="text"
            value={profile.lastName}
            onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
          />
          <AuthField
            id="settings-phone"
            label="Phone"
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
          />
          <AuthField
            id="settings-email"
            label="Email"
            type="email"
            value={user?.email ?? ''}
            disabled
            hint="Email is your login and cannot be changed."
          />
        </div>
        <div className={styles.personalActions}>
          <button type="button" className={styles.primary} onClick={saveProfile} disabled={profileSaving}>
            {profileSaving ? 'Saving…' : 'Save Changes'}
          </button>
          {profileSaved && (
            <span className={styles.saved} role="status">
              Saved ✓
            </span>
          )}
          {profileError && (
            <span className={styles.error} role="alert">
              {profileError}
            </span>
          )}
        </div>
      </DashboardCard>

      <DashboardCard kicker="Notifications" title="Email preferences">
        <div className={styles.switchList}>
          <SwitchRow
            id="pref-marketing"
            label="Marketing emails"
            note="Drops, restocks and member offers"
            checked={prefs.notifications?.marketingEmails}
            onChange={setPref('notifications', 'marketingEmails')}
          />
          <SwitchRow
            id="pref-order"
            label="Order updates"
            note="Shipping confirmations and delivery status"
            checked={prefs.notifications?.orderUpdates}
            onChange={setPref('notifications', 'orderUpdates')}
          />
          <SwitchRow
            id="pref-security"
            label="Security alerts"
            note="Sign-in and account security notices"
            checked={prefs.notifications?.securityAlerts}
            onChange={setPref('notifications', 'securityAlerts')}
          />
        </div>
      </DashboardCard>


      <DashboardCard kicker="Privacy" title="Privacy & data">
        <div className={styles.switchList}>
          <SwitchRow
            id="priv-personal"
            label="Personalized recommendations"
            note="Tune the shop using your browsing and order history"
            checked={prefs.privacy?.personalizedRecommendations}
            onChange={setPref('privacy', 'personalizedRecommendations')}
          />
          <SwitchRow
            id="priv-share"
            label="Share with partner brands"
            note="Let vetted partners see anonymized insights"
            checked={prefs.privacy?.shareWithPartners}
            onChange={setPref('privacy', 'shareWithPartners')}
          />
        </div>
      </DashboardCard>
    </div>
  );
}

function SwitchRow({ id, label, note, checked, onChange }) {
  return (
    <label className={styles.toggleRow} htmlFor={id}>
      <span className={styles.toggleText}>
        <span className={styles.toggleLabel}>{label}</span>
        <span className={styles.toggleNote}>{note}</span>
      </span>
      <Switch id={id} checked={Boolean(checked)} onChange={onChange} label={label} />
    </label>
  );
}

function Switch({ id, checked, onChange, label }) {
  return (
    <span className={styles.switch}>
      <input
        id={id}
        type="checkbox"
        className={styles.switchInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </span>
  );
}