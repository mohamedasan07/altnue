import { Link } from 'react-router-dom';
import Container from '../../ui/Container/Container';
import styles from './Footer.module.css';

const FOOTER_GROUPS = [
  {
    title: 'Shop',
    links: [
      { to: '/collections', label: 'Collections' },
      { to: '/cart', label: 'Cart' },
      { to: '/wishlist', label: 'Wishlist' },
      { to: '/login', label: 'Login' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/', label: 'Home' },
      { to: '/collections', label: 'About' },
      { to: '/collections', label: 'Journal' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div className={styles.brandBlock}>
          <p className={styles.brand}>UNSORTED<span className={styles.dot}>.</span></p>
          <p className={styles.tagline}>For the Unfiltered.</p>
        </div>

        <div className={styles.groups}>
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={`Footer — ${group.title}`}>
              <h2 className={styles.groupTitle}>{group.title}</h2>
              <ul className={styles.groupList}>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className={styles.groupLink}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </Container>

      <div className={styles.bottomBar}>
        <Container className={styles.bottomInner}>
          <p className={styles.copy}>© {new Date().getFullYear()} UNSORTED. All rights reserved.</p>
        </Container>
      </div>
    </footer>
  );
}