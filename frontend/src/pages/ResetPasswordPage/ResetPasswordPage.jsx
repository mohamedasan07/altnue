import { motion } from 'framer-motion';
import ResetPasswordForm from '../../components/auth/ResetPasswordForm/ResetPasswordForm';
import styles from './ResetPasswordPage.module.css';

/**
 * Reset password page — public route reached from the forgot-password email
 * link (?token=…). Consumes the one-time token via ResetPasswordForm.
 */
export default function ResetPasswordPage() {
  return (
    <section className={`page ${styles.section}`} aria-labelledby="reset-title">
      <header className={styles.header}>
        <p className="page-kicker">Account</p>
        <h1 id="reset-title" className={styles.title}>
          Set a new password.
        </h1>
      </header>

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <ResetPasswordForm />
      </motion.div>
    </section>
  );
}