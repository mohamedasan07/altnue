import ProfileCard from '../../components/auth/ProfileCard/ProfileCard';
import styles from './ProfilePage.module.css';

/**
 * Authenticated account page — avatar, identity, saved address and edit/logout.
 * Route is guarded by <ProtectedRoute>.
 */
export default function ProfilePage() {
  return (
    <section className={`page ${styles.section}`} aria-labelledby="profile-title">
      <header className={styles.header}>
        <p className="page-kicker">Account</p>
        <h1 id="profile-title" className={styles.title}>
          Your profile.
        </h1>
        <p className="page-lead">Manage your details, address and membership.</p>
      </header>

      <ProfileCard />
    </section>
  );
}