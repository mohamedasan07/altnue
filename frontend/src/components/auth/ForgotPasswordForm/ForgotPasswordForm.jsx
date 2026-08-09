import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { validateForgot } from '../../../utils/authValidation';
import { loadUsers, findUserByEmail } from '../../../services/authStorage';
import AuthField from '../AuthField/AuthField';
import styles from './ForgotPasswordForm.module.css';

/**
 * Forgot password — collects the email and shows a mock success state.
 * Link that would send a reset email is simulated in the UI only.
 */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validateForgot({ email });
    setError(fieldErrors.email || '');
    if (fieldErrors.email) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSubmitting(false);

    // Mock check for friendlier messaging, but always allow the "email sent" state.
    const known = findUserByEmail(loadUsers(), email);
    setSent(known ? 'reset' : 'unknown');
  };

  const onBack = () => {
    setSent(false);
    setEmail('');
    setError('');
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!sent ? (
        <motion.form
          key="forgot-form"
          className={styles.form}
          onSubmit={onSubmit}
          noValidate
          aria-label="Reset your password"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className={styles.lead}>
            Enter the email you used to register and we&apos;ll send you a secure
            reset link.
          </p>

          <AuthField
            id="forgot-email"
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@unfiltered.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            error={error}
            required
          />

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send Reset Link'}
          </button>

          <Link to="/login" className={styles.back}>
            ← Back to login
          </Link>
        </motion.form>
      ) : (
        <motion.div
          key="forgot-success"
          className={styles.success}
          role="status"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className={styles.successIcon} aria-hidden="true">
            ✓
          </span>
          <h2 className={styles.successTitle}>Check your inbox.</h2>
          {sent === 'unknown' && (
            <p className={styles.successNote}>
              We didn&apos;t find an account for {email}, but no problem — no reset
              link was sent. Use the link below to create one.
            </p>
          )}
          {sent === 'reset' && (
            <p className={styles.successNote}>
              If an account exists for <strong>{email}</strong>, a reset link is on
              its way.
            </p>
          )}
          <button type="button" className={styles.again} onClick={onReset}>
            Use a different email
          </button>
          <Link to="/login" className={styles.back}>
            ← Back to login
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}