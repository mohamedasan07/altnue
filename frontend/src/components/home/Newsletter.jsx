import { useState } from 'react';
import { motion } from 'framer-motion';
import Container from '../ui/Container/Container';
import { fadeUp, stagger } from '../../utils/motion';
import styles from './Newsletter.module.css';

export default function Newsletter() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className={styles.section} aria-labelledby="newsletter-title">
      <Container>
        <motion.div
          className={styles.box}
          variants={stagger(0.1, 0.12)}
          initial={false}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.div variants={fadeUp} className={styles.head}>
            <p className={styles.kicker}>Stay in the loop</p>
            <h2 id="newsletter-title" className={styles.title}>
              First looks, straight
              <br />
              to your inbox<span className={styles.accent}>.</span>
            </h2>
          </motion.div>

          <motion.p className={styles.note} variants={fadeUp}>
            Drops sell out. Get early access and restocks before anyone else
            does.
          </motion.p>

          {submitted ? (
            <motion.p
              className={styles.thanks}
              variants={fadeUp}
              role="status"
              aria-live="polite"
            >
              You&apos;re on the list<span className={styles.accent}>.</span>
            </motion.p>
          ) : (
            <motion.form
              className={styles.form}
              onSubmit={handleSubmit}
              variants={fadeUp}
            >
              <label className={styles.srOnly} htmlFor="newsletter-email">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                className={styles.input}
                autoComplete="email"
                required
              />
              <button type="submit" className={styles.button}>
                Subscribe
              </button>
            </motion.form>
          )}

          <motion.p className={styles.disclaimer} variants={fadeUp}>
            No spam — only drops. Unsubscribe anytime.
          </motion.p>
        </motion.div>
      </Container>
    </section>
  );
}