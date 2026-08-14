import { useCallback, useEffect, useState } from 'react';
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
} from '../services/addresses';

/**
 * Address book data hook — talks to the real Sprint 21.2 API.
 * Exposes loading/error state plus add / edit / delete / set-default helpers.
 * All mutations optimistically swap the cached list for a snappy UI; failures
 * restore the previous list and surface an error string.
 */
export function useAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const list = await fetchAddresses();
      setAddresses(list);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Unable to load your addresses.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addAddress = useCallback(async (values) => {
    setError('');
    try {
      const created = await createAddress(values);
      setAddresses((prev) => {
        const list = created.isDefault
          ? prev.map((a) => ({ ...a, isDefault: false }))
          : prev;
        return [...list, created];
      });
      return true;
    } catch (err) {
      setError(err.message || 'Unable to save the address.');
      return false;
    }
  }, []);

  const updateAddressById = useCallback(async (id, values) => {
    setError('');
    try {
      const updated = await updateAddress(id, values);
      setAddresses((prev) => {
        const list = updated.isDefault
          ? prev.map((a) => ({ ...a, isDefault: a.id === id }))
          : prev.map((a) => (a.id === id ? updated : a));
        return list;
      });
      return true;
    } catch (err) {
      setError(err.message || 'Unable to update the address.');
      return false;
    }
  }, []);

  const removeAddress = useCallback(async (id) => {
    setError('');
    try {
      await deleteAddress(id);
      setAddresses((prev) => {
        const next = prev.filter((a) => a.id !== id);
        if (!next.some((a) => a.isDefault) && next.length > 0) {
          next[0].isDefault = true;
        }
        return next;
      });
      return true;
    } catch (err) {
      setError(err.message || 'Unable to delete the address.');
      return false;
    }
  }, []);

  const setDefaultAddress = useCallback(
    async (id) => {
      setError('');
      try {
        const updated = await updateAddress(id, { isDefault: true });
        setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === updated.id })));
        return true;
      } catch (err) {
        setError(err.message || 'Unable to set the default address.');
        return false;
      }
    },
    []
  );

  return {
    addresses,
    status,
    error,
    reload,
    addAddress,
    updateAddressById,
    removeAddress,
    setDefaultAddress,
  };
}