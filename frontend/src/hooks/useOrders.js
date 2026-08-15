import { useCallback, useEffect, useState } from 'react';
import { fetchOrder, fetchOrders } from '../services/orders';

/**
 * Order history + detail hook (Sprint 21.3 Phase 4) — talks to the real
 * customer order API. Exposes loading/error state, a reload helper for the
 * list, and a getOrder(id) helper for the order detail modal.
 */
export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const list = await fetchOrders();
      setOrders(list);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Unable to load your orders.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Fetch a single order by id (detail view). */
  const getOrder = useCallback(async (id) => {
    const order = await fetchOrder(id);
    return order;
  }, []);

  return { orders, status, error, reload, getOrder };
}