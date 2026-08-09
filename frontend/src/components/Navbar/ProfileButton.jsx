import { Link } from 'react-router-dom';
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
 * Profile button — no authentication yet. Routes to login.
 */
export default function ProfileButton() {
  return (
    <Link to="/login" className={styles.iconLink} aria-label="Profile and login">
      {PROFILE_ICON}
      <span className="visually-hidden">Profile</span>
    </Link>
  );
}