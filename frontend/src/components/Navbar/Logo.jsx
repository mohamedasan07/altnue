import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';

export default function Logo({ onClick }) {
  return (
    <Link to="/" className={styles.logo} onClick={onClick} aria-label="ALTNUE — home">
      <span className={styles.logoText}>ALTNUE</span>
      <span className={styles.logoDot} aria-hidden="true">
        .
      </span>
    </Link>
  );
}