import Button from '../../components/ui/Button/Button';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <section className={`page ${styles.section}`} aria-labelledby="notfound-title">
      <p className="page-kicker">404</p>
      <h1 id="notfound-title" className={styles.title}>
        Lost in the unfiltered.
      </h1>
      <p className="page-lead">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Button to="/" variant="primary" size="md" className={styles.cta}>
        Back to home
      </Button>
    </section>
  );
}