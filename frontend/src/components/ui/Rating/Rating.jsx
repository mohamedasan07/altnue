import { cn } from '../../../utils/cn';
import styles from './Rating.module.css';

const STARS = [1, 2, 3, 4, 5];

function Star({ filled, size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={cn(styles.star, filled && styles.starFilled)}
      aria-hidden="true"
    >
      <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 0.7-4.3-3.1-3 4.3-.6z" />
    </svg>
  );
}

export default function Rating({ value = 0, count = 0, size = 14, reviewLabel = '' }) {
  const filled = Math.round(value);
  const half = value % 1 >= 0.4;

  const content =
    count > 0
      ? `${value.toFixed(1)} · ${count.toLocaleString('en-IN')}${reviewLabel ? ` ${reviewLabel}` : ''}`
      : value.toFixed(1);

  return (
    <div className={styles.wrap} title={`Rated ${value.toFixed(1)} out of 5`}>
      <span className={styles.stars}>
        {STARS.map((i) => (
          <Star key={i} filled={i <= filled || (i === filled + 1 && half)} size={size} />
        ))}
      </span>
      <span className={styles.text}>{content}</span>
    </div>
  );
}