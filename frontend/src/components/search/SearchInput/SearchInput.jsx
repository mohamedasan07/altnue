import { forwardRef } from 'react';
import styles from './SearchInput.module.css';

/**
 * Accessible live-search input. Exposes an imperative `clear` via ref so
 * parent controls can reset it. Combobox semantics are wired by the overlay.
 */
const SearchInput = forwardRef(function SearchInput(
  {
    value,
    onChange,
    onKeyDown,
    id,
    label = 'Search products',
    placeholder = 'Search streetwear…',
    controlsId,
    expanded = false,
    activeDescendantId,
  },
  ref
) {
  return (
    <div className={styles.field}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
        className={styles.icon}
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
      <input
        ref={ref}
        id={id}
        type="search"
        role="combobox"
        aria-label={label}
        aria-controls={controlsId}
        aria-expanded={expanded}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendantId}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoComplete="off"
        spellCheck="false"
        className={styles.input}
      />
      <button
        type="button"
        className={styles.clear}
        onClick={() => onChange({ target: { value: '' } })}
        aria-label="Clear search"
        tabIndex={value ? 0 : -1}
      >
        ✕
      </button>
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;