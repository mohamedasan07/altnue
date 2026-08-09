import { cn } from '../../../utils/cn';
import styles from './Loader.module.css';

export default function Loader({ size = 'md', fullscreen = false, label = 'Loading', className }) {
  return (
    <div
      className={cn(
        styles.wrap,
        fullscreen && styles.fullscreen,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className={cn(styles.spinner, styles[size])} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}