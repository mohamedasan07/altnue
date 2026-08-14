import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { validatePassword } from '../../../utils/authValidation';
import { confirmPasswordReset } from '../../../services/customerAuth';
import AuthField from '../AuthField/AuthField';
import styles from './ResetPasswordForm.module.css';

/**
 * Reset password — consumes the one-time token from the URL (?token=…)
 * produced by the backend forgot-password flow. On success the user is
 * redirected to the login page.
 */
export default function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => {
    const next = { ...values, [field]: e.target.value };
    setValues(next);
    setFormError('');
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleBlur = (field) => () => {
    const passwordError = validatePassword(values.password);
    const next = {};
    if (field === 'password' && passwordError) next.password = passwordError;
    if (field === 'confirmPassword' && values.password !== values.confirmPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }
    setErrors((prev) => ({ ...prev, ...next }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setFormError('This reset link is invalid or has expired. Please request a new one.');
      return;
    }

    const next = {};
    const passwordError = validatePassword(values.password);
    if (passwordError) next.password = passwordError;
    if (values.password !== values.confirmPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }
    setErrors(next);
    if (Object.keys(next).some((k) => next[k])) return;

    setSubmitting(true);
    setFormError('');
    try {
      await confirmPasswordReset(token, values.password);
      navigate('/login', {
        replace: true,
        state: { resetDone: true },
      });
    } catch (err) {
      setFormError(err.message || 'Unable to reset your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <motion.div
        className={styles.errorState}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className={styles.errorTitle}>Invalid reset link.</h2>
        <p className={styles.errorNote}>
          This link is missing or has expired. Request a new one from the forgot
          password page.
        </p>
        <Link to="/forgot-password" className={styles.link}>
          Request a new link
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.form
      className={styles.form}
      onSubmit={onSubmit}
      noValidate
      aria-label="Set a new password"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className={styles.lead}>
        Choose a new password for your account. It must be at least 8
        characters.
      </p>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <AuthField
        id="reset-password"
        label="New Password"
        type="password"
        name="password"
        autoComplete="new-password"
        placeholder="8+ characters"
        value={values.password}
        onChange={handleChange('password')}
        onBlur={handleBlur('password')}
        error={errors.password}
        required
      />

      <AuthField
        id="reset-confirm-password"
        label="Confirm New Password"
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Repeat password"
        value={values.confirmPassword}
        onChange={handleChange('confirmPassword')}
        onBlur={handleBlur('confirmPassword')}
        error={errors.confirmPassword}
        required
      />

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? 'Resetting…' : 'Reset Password'}
      </button>

      <Link to="/login" className={styles.back}>
        ← Back to login
      </Link>
    </motion.form>
  );
}