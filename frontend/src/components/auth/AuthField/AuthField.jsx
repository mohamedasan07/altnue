import { forwardRef, useState } from 'react';
import { cn } from '../../../utils/cn';
import styles from './AuthField.module.css';

/**
 * Accessible form field for the auth screens.
 * Supports a show/hide toggle for passwords and inline error messaging.
 */
const AuthField = forwardRef(function AuthField(
  {
    id,
    label,
    type = 'text',
    value,
    onChange,
    onBlur,
    error,
    hint,
    autoComplete,
    placeholder,
    name,
    required = false,
    disabled = false,
    className,
  },
  ref
) {
  const isPassword = type === 'password';
  const [show, setShow] = useState(false);
  const inputType = isPassword && show ? 'text' : type;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn(styles.field, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className={styles.control}>
        <input
          ref={ref}
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(styles.input, isPassword && styles.inputPaddingRight, error && styles.inputError)}
        />

        {isPassword && (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {show ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 3l18 18" />
                <path d="M10 5.5A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 3.8" />
                <path d="M6.6 6.6A15.4 15.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4-0.9" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});

AuthField.displayName = 'AuthField';

export default AuthField;