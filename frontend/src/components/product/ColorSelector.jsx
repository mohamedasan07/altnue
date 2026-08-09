import { cn } from '../../utils/cn';
import styles from './ColorSelector.module.css';

/**
 * Color selector — UI state only. Exposes selected swatch via callback.
 */
export default function ColorSelector({
  colors = [],
  value,
  onChange,
  label = 'Color',
  disabled = false,
}) {
  const picked = value ?? colors[0]?.value;

  return (
    <fieldset className={styles.field} disabled={disabled}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.swatches} role="radiogroup" aria-label={label}>
        {colors.map((color) => {
          const selected = color.value === picked;
          return (
            <button
              key={color.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${label}: ${color.name}`}
              className={cn(styles.swatch, selected && styles.active)}
              onClick={() => onChange?.(color.value, color.name)}
            >
              <span className={styles.dot} style={{ background: color.hex }} />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}