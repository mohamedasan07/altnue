import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { validateForgot, normalizeEmail } from '../../../utils/authValidation';
import { requestPasswordReset } from '../../../services/customerAuth';
import AuthField from '../AuthField/AuthField';
import styles from './ForgotPasswordForm.module.css';

/**
 * Forgot password — sends the backend a reset request. The server responds
 * identically for known and unknown emails (anti-enumeration); in development
 * it returns a devResetUrl that is surfaced so the flow is testable without a
 * mailer.
 */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validateForgot({ email });
    setError(fieldErrors.email || '');
    if (fieldErrors.email) return;

    setSubmitting(true);
    setFormError('');
    try {
      const data = await requestPasswordReset(normalizeEmail(email));
      setResetUrl(data?.devResetUrl || '');
      setSent(true);
    } catch (err) {
      setFormError(err.message || 'Unable to send the reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = () => {
    setSent(false);
    setEmail('');
    setError('');
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

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
          <p className={styles.successNote}>
            If an account exists for <strong>{email}</strong>, a reset link is
            on its way.
          </p>
          {resetUrl && (
            <p className={styles.resetLink}>
              Dev link (no mail server configured):{' '}
              <a href={resetUrl}>{resetUrl}</a>
            </p>
          )}
          <button type="button" className={styles.again} onClick={onBack}>
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