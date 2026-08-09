import { cn } from '../../../utils/cn';
import CategoryFilter from '../CategoryFilter/CategoryFilter';
import PriceSlider from '../PriceSlider/PriceSlider';
import styles from './FilterSidebar.module.css';

const STOCK_OPTIONS = [
  { id: null, label: 'All' },
  { id: 'true', label: 'In Stock' },
  { id: 'false', label: 'Out of Stock' },
];

/**
 * Full filter set: categories, price range, availability, sale, reset.
 * Used inside the desktop rail and the mobile drawer.
 */
export default function FilterSidebar({
  categories = [],
  category,
  onCategory,
  bounds,
  priceMin,
  priceMax,
  onPriceChange,
  sale,
  onSale,
  instock,
  onInstock,
  hasFilters,
  onReset,
  onFilterCommit,
}) {
  return (
    <div className={styles.sidebar}>
      <section className={styles.section} aria-labelledby="filter-category">
        <h2 id="filter-category" className={styles.sectionTitle}>
          Category
        </h2>
        <CategoryFilter categories={categories} value={category} onChange={(id) => {
          onCategory(id);
          onFilterCommit?.();
        }} />
      </section>

      <section className={styles.section} aria-labelledby="filter-price">
        <h2 id="filter-price" className={styles.sectionTitle}>
          Price
        </h2>
        <PriceSlider
          min={bounds.min}
          max={bounds.max}
          step={100}
          valueMin={priceMin}
          valueMax={priceMax}
          onChange={(min, max) => {
            onPriceChange(min, max);
            onFilterCommit?.();
          }}
        />
      </section>

      <section className={styles.section} aria-labelledby="filter-availability">
        <h2 id="filter-availability" className={styles.sectionTitle}>
          Availability
        </h2>

        <div className={styles.rows}>
          <div className={styles.switchRow}>
            <span className={styles.switchLabel}>Sale only</span>
            <button
              type="button"
              role="switch"
              aria-checked={sale}
              className={cn(styles.switch, sale && styles.switchOn)}
              onClick={() => {
                onSale(!sale);
                onFilterCommit?.();
              }}
            >
              <span className={styles.switchThumb} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.segmented} role="radiogroup" aria-label="Stock status">
            {STOCK_OPTIONS.map((option) => {
              const active = instock === option.id;
              return (
                <button
                  key={option.id ?? 'all'}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={cn(styles.seg, active && styles.segActive)}
                  onClick={() => {
                    onInstock(option.id);
                    onFilterCommit?.();
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {hasFilters && (
        <button type="button" className={styles.reset} onClick={onReset}>
          Reset filters
        </button>
      )}
    </div>
  );
}