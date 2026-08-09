import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useBoolean } from '../../../hooks/useBoolean';
import styles from './ProfileDropdown.module.css';

const initialsOf = (user) => {
  const first = (user?.firstName || '').trim().charAt(0);
  const last = (user?.lastName || '').trim().charAt(0);
  return (first || last || 'U').toUpperCase() + (last || '');
};

const MENU = [
  { to: '/account', label: 'Profile' },
  { to: '/wishlist', label: 'Wishlist' },
];

/**
 * Logged-in navbar identity control.
 * Avatar button → animated dropdown (Profile / Wishlist / Orders placeholder /
 * Logout). Closes on outside click, Escape, navigation and logout.
 */
export default function ProfileDropdown({ user }) {
  const { logout } = useAuth();
  const { value: open, setTrue, setFalse } = useBoolean(false);
  const triggerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useFocusTrap(open);

  // Close whenever the route changes (menu items navigate away).
  useEffect(() => {
    if (open) setFalse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
        setFalse();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setFalse();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setFalse, panelRef]);

  const handleLogout = () => {
    setFalse();
    logout();
    navigate('/');
  };

  const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Member';

  return (
    <div className={styles.root}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => (open ? setFalse() : setTrue())}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className={styles.avatar} aria-hidden="true">
          {initialsOf(user)}
        </span>
        <span className="visually-hidden">Account menu</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            className={styles.menu}
            role="menu"
            aria-label="Account"
            tabIndex={-1}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className={styles.ident}>
              <p className={styles.name}>{name}</p>
              <p className={styles.email}>{user?.email}</p>
            </header>

            <ul className={styles.list}>
              {MENU.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className={styles.item} role="menuitem">
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <span className={styles.soon} title="Orders are coming soon">
                  Orders
                  <span className={styles.soonTag}>Soon</span>
                </span>
              </li>
            </ul>

            <footer className={styles.foot}>
              <button type="button" className={styles.logout} onClick={handleLogout}>
                Logout
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}