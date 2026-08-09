import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';
import styles from './Navbar.module.css';

// Single source of truth for navigation links — shared by desktop + mobile.
export const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/collections', label: 'Shop' },
  { to: '/collections', label: 'Collections' },
  { to: '/collections?feature=new-arrivals', label: 'New Arrivals' },
];

/**
 * Renders the primary navigation links.
 * `mobile` renders the large touch-friendly list used by MobileMenu.
 */
export default function NavLinks({ mobile = false, onNavigate }) {
  return (
    <ul className={mobile ? styles.mobileList : styles.navList}>
      {NAV_ITEMS.map(({ to, label, end }, index) => (
        <li key={label}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                mobile ? styles.mobileLink : styles.link,
                isActive && (mobile ? styles.mobileLinkActive : styles.linkActive)
              )
            }
          >
            {mobile && (
              <span className={styles.mobileIndex} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
            )}
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}