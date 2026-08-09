import { useCallback, useEffect, useMemo, useState } from 'react';

export const DEFAULT_SEARCH_DEBOUNCE = 300;

const SAFE_FIELDS = ['name', 'category', 'description'];

/**
 * Live text search over a product list.
 * - `query` is the raw input; results update after `debounceMs` of inactivity.
 * - Matches name / category / description (case-insensitive substring).
 * - `reset()` clears the query without a loading flicker.
 */
export default function useSearch({ products = [], debounceMs = DEFAULT_SEARCH_DEBOUNCE } = {}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const term = query.trim();
    if (term === debounced) return undefined;
    const timer = window.setTimeout(() => setDebounced(term), debounceMs);
    return () => window.clearTimeout(timer);
  }, [query, debounced, debounceMs]);

  const results = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return [];
    return products.filter((product) =>
      SAFE_FIELDS.some((field) =>
        String(product?.[field] || '').toLowerCase().includes(term)
      )
    );
  }, [products, debounced]);

  const reset = useCallback(() => {
    setQuery('');
    setDebounced('');
  }, []);

  return {
    query,
    setQuery,
    results,
    total: results.length,
    searching: Boolean(debounced.trim()),
    reset,
  };
}