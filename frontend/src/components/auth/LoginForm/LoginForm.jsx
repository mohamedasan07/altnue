import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { validateLogin } from '../../../utils/authValidation';
import AuthField from '../AuthField/AuthField';
import styles from './LoginForm.module.css';

/**
 * Login form — email + password + remember me.
 * Mock auth via AuthContext (localStorage-backed). Shows inline field errors
 * and a hand-keyed password error returned by the (fake) sign-in.
 */
export default function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (field) => (e) => {
    const next = { ...values, [field]: e.target.value };
    setValues(next);
    setFormError('');
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleBlur = (field) => () => {
    const fieldErrors = validateLogin(values);
    setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] || '' }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = validateLogin(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).some((k) => fieldErrors[k])) return;

    setSubmitting(true);
    setFormError('');
    try {
      const user = await login(values);
      onSuccess?.(user);
    } catch (err) {
      if (err.field) {
        setErrors((prev) => ({ ...prev, [err.field]: err.message }));
      } else {
        setFormError(err.message || 'Unable to sign in.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      className={styles.form}
      onSubmit={onSubmit}
      noValidate
      aria-label="Sign in to your account"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <AuthField
        id="login-email"
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@unfiltered.com"
        value={values.email}
        onChange={handleChange('email')}
        onBlur={handleBlur('email')}
        error={errors.email}
        required
      />

      <AuthField
        id="login-password"
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={values.password}
        onChange={handleChange('password')}
        onBlur={handleBlur('password')}
        error={errors.password}
        required
      />

      <div className={styles.row}>
        <label className={styles.remember}>
          <input
            type="checkbox"
            name="remember"
            checked={values.remember}
            onChange={(e) => setValues((v) => ({ ...v, remember: e.target.checked }))}
          />
          <span>Remember me</span>
        </label>

        <Link to="/forgot-password" className={styles.forgot}>
          Forgot password?
        </Link>
      </div>

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? 'Signing in…' : 'Login'}
      </button>
    </motion.form>
  );
}