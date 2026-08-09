import { useRef } from 'react';
import styles from './ImageZoom.module.css';

/**
 * Main product image with cursor-tracking zoom.
 * The button wrapper keeps the zoom target keyboard-accessible and
 * forwards click to open the fullscreen preview.
 */
export default function ImageZoom({ src, alt, onClick, eager = false }) {
  const imgRef = useRef(null);

  const onMouseMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    imgRef.current?.style.setProperty('--px', `${px}%`);
    imgRef.current?.style.setProperty('--py', `${py}%`);
  };

  return (
    <div className={styles.zoom} onMouseMove={onMouseMove}>
      <button
        type="button"
        className={styles.open}
        onClick={onClick}
        aria-label={`Open image: ${alt}`}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={styles.img}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      </button>
      <span className={styles.hint} aria-hidden="true">
        Hover to zoom
      </span>
    </div>
  );
}