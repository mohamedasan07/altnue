import { motion } from 'framer-motion';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm/ForgotPasswordForm';
import styles from './ForgotPasswordPage.module.css';

/**
 * Forgot password page — collects an email and shows a mock success state.
 */
export default function ForgotPasswordPage() {
  return (
    <section className={`page ${styles.section}`} aria-labelledby="forgot-title">
      <header className={styles.header}>
        <p className="page-kicker">Account</p>
        <h1 id="forgot-title" className={styles.title}>
          Reset your password.
        </h1>
      </header>

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <ForgotPasswordForm />
      </motion.div>
    </section>
  );
}