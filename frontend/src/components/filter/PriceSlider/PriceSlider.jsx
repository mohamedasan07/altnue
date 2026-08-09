import { useEffect, useRef, useState } from 'react';
import styles from './PriceSlider.module.css';

const clampValue = (value, a, b) => Math.min(Math.max(value, a), b);
const snap = (value, step, min, max) => clampValue(Math.round(value / step) * step, min, max);

/**
 * Dual-thumb price range slider.
 * - Local thumbs update live while dragging; the committed range is
 *   debounced (~350ms) so the URL isn't spammed mid-drag.
 * - External value changes (reset / back/forward) re-sync local state.
 */
export default function PriceSlider({
  min = 0,
  max = 1000,
  step = 50,
  valueMin,
  valueMax,
  onChange,
}) {
  const loBound = valueMin ?? min;
  const hiBound = valueMax ?? max;

  const [lo, setLo] = useState(() => snap(loBound, step, min, max));
  const [hi, setHi] = useState(() => snap(hiBound, step, min, max));
  const pendingRef = useRef(false);
  const timerRef = useRef(null);

  // Follow external changes (URL navigation, reset) when not dragging.
  useEffect(() => {
    if (!pendingRef.current) {
      setLo(snap(loBound, step, min, max));
      setHi(snap(hiBound, step, min, max));
    }
  }, [loBound, hiBound, min, max, step]);

  // Clear any pending debounced commit on unmount.
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const commit = (nextLo, nextHi) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      pendingRef.current = false;
      if (onChange) onChange(nextLo, nextHi);
    }, 350);
  };

  const handleLo = (e) => {
    pendingRef.current = true;
    const next = snap(clampValue(Number(e.target.value), min, hi), step, min, max);
    setLo(next);
    commit(next, hi);
  };

  const handleHi = (e) => {
    pendingRef.current = true;
    const next = snap(clampValue(Number(e.target.value), lo, max), step, min, max);
    setHi(next);
    commit(lo, next);
  };

  const pct = (value) => ((value - min) / (max - min)) * 100;

  return (
    <div className={styles.wrap}>
      <div className={styles.values}>
        <span className={styles.value}>
          <span className={styles.valueLabel}>Min</span> ₹{lo.toLocaleString('en-IN')}
        </span>
        <span className={styles.value}>
          <span className={styles.valueLabel}>Max</span> ₹{hi.toLocaleString('en-IN')}
        </span>
      </div>

      <div className={styles.track}>
        <div className={styles.rail} />
        <div
          className={styles.fill}
          style={{
            left: `${Math.min(pct(lo), pct(hi))}%`,
            width: `${Math.abs(pct(hi) - pct(lo))}%`,
          }}
        />
        <input
          type="range"
          className={`${styles.range} ${styles.rangeLow}`}
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={handleLo}
          aria-label={`Minimum price, ₹${lo.toLocaleString('en-IN')}`}
        />
        <input
          type="range"
          className={`${styles.range} ${styles.rangeHigh}`}
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={handleHi}
          aria-label={`Maximum price ₹${hi.toLocaleString('en-IN')}`}
        />
      </div>
    </div>
  );
}