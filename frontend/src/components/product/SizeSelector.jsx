import { cn } from '../../utils/cn';
import styles from './SizeSelector.module.css';

/**
 * Size selector — one selectable size. Exposes selection via onChange.
 */
export default function SizeSelector({
  sizes = [],
  value,
  onChange,
  unavailable = [],
  label = 'Size',
}) {
  if (!sizes.length) return null;

  return (
    <fieldset className={styles.field}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.sizes} role="radiogroup" aria-label={label}>
        {sizes.map((size) => {
          const selected = size === value;
          const soldOut = unavailable.includes(size);
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={soldOut}
              aria-disabled={soldOut}
              title={soldOut ? `${size} — out of stock` : size}
              className={cn(styles.btn, selected && styles.active, soldOut && styles.soldOut)}
              onClick={() => onChange?.(size)}
            >
              {size}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}