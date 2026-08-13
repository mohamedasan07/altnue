import classNames from '../../utils/classNames'
import Loader from './Loader'
import styles from './Button.module.css'

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'outline']
const BUTTON_SIZES = ['sm', 'md', 'lg']

function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
  children,
  ...rest
}) {
  const classes = classNames(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.isLoading,
    className,
  )

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader size="sm" className={styles.spinner} />}
      {children}
    </button>
  )
}

Button.VARIANTS = BUTTON_VARIANTS
Button.SIZES = BUTTON_SIZES

export default Button
