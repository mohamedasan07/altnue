import { cn } from '../../utils/cn';
import styles from './ThumbnailStrip.module.css';

/**
 * Vertical/horizontal list of gallery thumbs.
 * Keyboard-focusable, exposes selection via aria.
 */
export default function ThumbnailStrip({ images = [], activeIndex = 0, onSelect, label }) {
  if (!images.length) return null;

  return (
    <div
      className={styles.strip}
      role="listbox"
      aria-label={label || 'Product images'}
      aria-orientation="vertical"
    >
      {images.map((src, i) => {
        const selected = i === activeIndex;
        return (
          <button
            key={src}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={`View image ${i + 1} of ${images.length}`}
            className={cn(styles.thumb, selected && styles.active)}
            onClick={() => onSelect?.(i)}
          >
            <img src={src} alt="" loading="lazy" decoding="async" className={styles.thumbImg} />
          </button>
        );
      })}
    </div>
  );
}