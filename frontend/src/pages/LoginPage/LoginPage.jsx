import Button from '../../components/ui/Button/Button';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  return (
    <section className={`page ${styles.section}`} aria-labelledby="login-title">
      <p className="page-kicker">Account</p>
      <h1 id="login-title" className="page-title">
        Login.
      </h1>
      <p className="page-lead">
        Auth flows (email + admin) arrive in Sprint 3.
      </p>
      <Button to="/collections" variant="outline" size="md" className={styles.cta}>
        Browse collections
      </Button>
    </section>
  );
}