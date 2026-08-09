import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../utils/cn';
import styles from './Button.module.css';

/**
 * Polymorphic button.
 * - `to` renders a react-router <Link>
 * - `href` renders an <a>
 * - otherwise renders a <button>
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', to, href, className, children, ...props },
  ref
) {
  const classes = cn(styles.base, styles[variant], styles[size], className);

  if (to) {
    return (
      <Link to={to} className={classes} ref={ref} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} ref={ref} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={classes} ref={ref} {...props}>
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;