import { useId } from 'react'
import classNames from '../../utils/classNames'
import styles from './Input.module.css'

function Input({
  label,
  id: idProp,
  error,
  hint,
  icon,
  className,
  fullWidth = false,
  ...rest
}) {
  const autoId = useId()
  const inputId = idProp ?? autoId
  const hintId = `${inputId}-hint`

  return (
    <div
      className={classNames(
        styles.field,
        fullWidth && styles.fullWidth,
        className,
      )}
    >
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}

      <div className={styles.control}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          id={inputId}
          className={classNames(
            styles.input,
            icon && styles.withIcon,
            error && styles.invalid,
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? hintId : hint ? hintId : undefined}
          {...rest}
        />
      </div>

      {hint && !error && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={hintId} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  )
}

export default Input
