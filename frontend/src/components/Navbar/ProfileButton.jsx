import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ProfileDropdown from '../auth/ProfileDropdown/ProfileDropdown';
import styles from './Navbar.module.css';

const PROFILE_ICON = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="7.5" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

/**
 * Profile button — logged out shows a login icon; logged in shows the avatar
 * and an account dropdown (Profile / Wishlist / Orders / Logout).
 */
export default function ProfileButton() {
  const { user } = useAuth();

  if (user) {
    return <ProfileDropdown user={user} />;
  }

  return (
    <Link to="/login" className={styles.iconLink} aria-label="Login and create account">
      {PROFILE_ICON}
      <span className="visually-hidden">Login</span>
    </Link>
  );
}