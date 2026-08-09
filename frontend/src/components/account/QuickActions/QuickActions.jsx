import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './QuickActions.module.css';

const ACTIONS = [
  { to: '/account/profile', label: 'Edit Profile', note: 'Name, phone & details', icon: <IconUser /> },
  { to: '/account/wishlist', label: 'Go to Wishlist', note: 'Your saved pieces', icon: <IconHeart /> },
  { to: '/account/orders', label: 'View Orders', note: 'Track every drop', icon: <IconBox /> },
  { to: '/collections', label: 'Continue Shopping', note: 'Back to the store', icon: <IconArrow /> },
];

/**
 * Quick action cards — prominent shortcuts into the most-used areas.
 */
export default function QuickActions() {
  return (
    <motion.ul
      className={styles.grid}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
    >
      {ACTIONS.map(({ to, label, note, icon }) => (
        <motion.li
          key={to}
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
          }}
        >
          <Link to={to} className={styles.card}>
            <span className={styles.icon} aria-hidden="true">
              {icon}
            </span>
            <span className={styles.label}>{label}</span>
            <span className={styles.note}>{note}</span>
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.6-7-10.1A4.4 4.4 0 0 1 12 6a4.4 4.4 0 0 1 7 3.8C19 15.4 12 20 12 20z" />
    </svg>
  );
}
function IconBox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7l8-4 8 4v10l-8 4-8-4V7z" />
      <path d="M4 7l8 4 8-4" />
      <path d="M12 11v10" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  );
}