import { AnimatePresence, motion } from 'framer-motion';
import styles from './RecentSearches.module.css';

const STAGGER = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
const ITEM = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Empty-query search state: recent searches (cleared list) + popular
 * categories. All interactions navigate through the parent overlay.
 */
export default function RecentSearches({ terms = [], onSelectTerm, onClear, categories = [], onSelectCategory }) {
  return (
    <>
      <AnimatePresence initial={false}>
        {terms.length > 0 && (
          <motion.section
            className={styles.section}
            variants={STAGGER}
            initial="hidden"
            animate="visible"
            aria-labelledby="recent-searches-title"
          >
            <header className={styles.sectionHead}>
              <h2 id="recent-searches-title" className={styles.sectionTitle}>
                Recent searches
              </h2>
              <button type="button" className={styles.clear} onClick={onClear} aria-label="Clear search history">
                Clear
              </button>
            </header>
            <div className={styles.terms}>
              {terms.map((term) => (
                <motion.button
                  key={term}
                  type="button"
                  variants={ITEM}
                  className={styles.term}
                  onClick={() => onSelectTerm(term)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className={styles.clock}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  {term}
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {categories.length > 0 && (
        <section className={styles.section} aria-labelledby="popular-categories-title">
          <h2 id="popular-categories-title" className={styles.sectionTitle}>
            Popular categories
          </h2>
          <div className={styles.cats}>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={styles.cat}
                onClick={() => onSelectCategory(category.id)}
              >
                {category.id === 'all' ? 'All' : category.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}