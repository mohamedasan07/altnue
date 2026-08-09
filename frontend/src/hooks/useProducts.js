import { useCallback, useEffect, useState } from 'react';
import { fetchProducts } from '../services';

// Module-level cache shared by every consumer (navbar search, home,
// collections, product page). One fetch per tab session; `reload()` busts it.
const cache = { promise: null };

function cachedFetch() {
  if (!cache.promise) {
    cache.promise = fetchProducts().catch((err) => {
      cache.promise = null; // failed loads can be retried
      throw err;
    });
  }
  return cache.promise;
}

export default function useProducts() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const list = await cachedFetch();
      setProducts(list);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(async () => {
    cache.promise = null;
    await load();
  }, [load]);

  return { products, status, error, reload };
}