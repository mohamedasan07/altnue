import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import ImageZoom from './ImageZoom';
import ThumbnailStrip from './ThumbnailStrip';
import styles from './ProductGallery.module.css';

/**
 * Product gallery: vertical thumbnails + zoomable main image
 * + fullscreen lightbox with keyboard navigation.
 */
export default function ProductGallery({ images = [], productName = 'Product' }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reset index only when the image set actually changes (new product),
  // not on every render — images may be rebuilt inline by the parent.
  const imageKey = images.join('|');
  useEffect(() => setActive(0), [imageKey]);

  const clampedImages = images.length ? images : [];
  const current = clampedImages[Math.min(active, clampedImages.length - 1)] || null;

  const next = useCallback(() => {
    if (!clampedImages.length) return;
    setActive((a) => (a + 1) % clampedImages.length);
  }, [clampedImages.length]);

  const prev = useCallback(() => {
    if (!clampedImages.length) return;
    setActive((a) => (a - 1 + clampedImages.length) % clampedImages.length);
  }, [clampedImages.length]);

  // Lightbox: Escape closes, arrows navigate, body scroll locked.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, next, prev]);

  if (!mounted || !clampedImages.length) {
    return <div className={styles.empty} aria-label="No images available" />;
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.layout}>
        <ThumbnailStrip
          images={clampedImages}
          activeIndex={active}
          onSelect={setActive}
          label={`${productName} images`}
        />
        <div className={styles.main}>
          <ImageZoom
            key={current}
            src={current}
            alt={`${productName} — image ${active + 1}`}
            eager
            onClick={() => setOpen(true)}
          />
        </div>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className={styles.lightbox}
                role="dialog"
                aria-modal="true"
                aria-label={`${productName} image ${active + 1}`}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.button
                  type="button"
                  className={styles.close}
                  onClick={() => setOpen(false)}
                  aria-label="Close fullscreen image"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                    strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 5l14 14" />
                    <path d="M19 5L5 19" />
                  </svg>
                </motion.button>

                <motion.button
                  type="button"
                  className={styles.nav}
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  aria-label="Previous image"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  ‹
                </motion.button>

                <motion.img
                  key={current}
                  src={current}
                  alt={`${productName} — image ${active + 1}`}
                  className={styles.lightboxImg}
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0.4, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                />

                <button
                  type="button"
                  className={styles.nav}
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  aria-label="Next image"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  ›
                </button>

                <span className={styles.counter} aria-hidden="true">
                  {active + 1} / {clampedImages.length}
                </span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}