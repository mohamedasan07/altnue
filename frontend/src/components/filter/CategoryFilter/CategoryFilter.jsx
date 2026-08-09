import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import styles from './CategoryFilter.module.css';

const Check = ({ active }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn(styles.check, active && styles.checkOn)}
  >
    <path d="M5 13l4 4L19 7" />
  </svg>
);

/**
 * Single-select category list with counts. Radio-group semantics.
 */
export default function CategoryFilter({ categories = [], value = 'all', onChange }) {
  return (
    <div className={styles.group} role="radiogroup" aria-label="Category">
      {categories.map((category) => {
        const active = value === category.id;
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={cn(styles.option, active && styles.optionActive)}
            onClick={() => onChange(category.id)}
          >
            <span className={styles.marker}>
              <Check active={active} />
            </span>
            <span className={styles.label}>{category.label}</span>
            <span className={styles.count}>{category.count}</span>
          </button>
        );
      })}
    </div>
  );
}