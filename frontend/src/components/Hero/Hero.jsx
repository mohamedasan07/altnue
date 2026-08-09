import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import Button from '../ui/Button/Button';
import { EASE_OUT, fadeUp, lineMask, scaleFadeIn, stagger } from '../../utils/motion';
import styles from './Hero.module.css';

const ARROW_RIGHT = (
  <svg
    className={styles.ctaArrow}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 12h16" />
    <path d="M13 5l7 7-7 7" />
  </svg>
);

export default function Hero({
  eyebrow = 'UNSORTED',
  description =
    "Premium streetwear designed for those who don't follow trends—they create them.",
  primaryCta = { label: 'Shop Collection', to: '/collections' },
  secondaryCta = { label: 'Explore Lookbook', to: '/collections' },
  imageUrl = '',
}) {
  const prefersReduced = useReducedMotion();
  const heroRef = useRef(null);

  // Subtle parallax driven by pointer position (motion values → no re-renders).
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 16, mass: 0.6 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 16, mass: 0.6 });
  const parallaxX = useTransform(springX, (v) => v * -22);
  const parallaxY = useTransform(springY, (v) => v * -16);

  const handlePointerMove = (e) => {
    if (prefersReduced) return;
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const visualStyle = prefersReduced ? undefined : { x: parallaxX, y: parallaxY };

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      onPointerMove={handlePointerMove}
      aria-labelledby="hero-headline"
    >
      <motion.div
        className={styles.grid}
        variants={stagger(0.15, 0.12)}
        initial={prefersReduced ? false : 'hidden'}
        animate="visible"
      >
        {/* ---- Left: brand statement ---- */}
        <div className={styles.content}>
          <motion.p variants={fadeUp} className={styles.eyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            {eyebrow}
          </motion.p>

          <h1 id="hero-headline" className={styles.headline}>
            <span className={styles.line}>
              <motion.span variants={lineMask} className={styles.lineText}>
                FOR&nbsp;THE
              </motion.span>
            </span>
            <span className={styles.line}>
              <motion.span variants={lineMask} className={styles.lineText}>
                UNFILTERED<span className={styles.accent}>.</span>
              </motion.span>
            </span>
          </h1>

          <motion.p variants={fadeUp} className={styles.subheading}>
            {description}
          </motion.p>

          <motion.div variants={fadeUp} className={styles.ctaRow}>
            <Button to={primaryCta.to} variant="primary" size="lg" className={styles.cta}>
              {primaryCta.label}
              {ARROW_RIGHT}
            </Button>
            <Button to={secondaryCta.to} variant="outline" size="lg" className={styles.cta}>
              {secondaryCta.label}
              {ARROW_RIGHT}
            </Button>
          </motion.div>
        </div>

        {/* ---- Right: stylized abstract composition ---- */}
        <motion.div
          variants={scaleFadeIn}
          className={styles.visualWrap}
          style={visualStyle}
        >
          <div className={styles.frame}>
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className={styles.heroImage}
                aria-hidden="true"
              />
            )}

            <div className={styles.glow} aria-hidden="true" />
            <span className={styles.sign} aria-hidden="true">
              UN
            </span>
            <span className={styles.tile} aria-hidden="true" />
            <span className={styles.square} aria-hidden="true">
              <i />
            </span>
            <span className={styles.orb} aria-hidden="true" />
            <span className={styles.vLabel} aria-hidden="true">
              FOR THE UNFILTERED — EST
            </span>
            <span className={styles.cross} aria-hidden="true">
              +
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* ---- Scroll indicator (decorative) ---- */}
      <div className={styles.scroll} aria-hidden="true">
        <motion.span
          className={styles.scrollLine}
          animate={
            prefersReduced
              ? undefined
              : { scaleY: [0.3, 1, 0.3] }
          }
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <span className={styles.scrollLabel}>Scroll</span>
      </div>
    </section>
  );
}