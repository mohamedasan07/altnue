import { useState } from 'react';
import { motion } from 'framer-motion';
import { loadAddresses, saveAddresses } from '../../services/addressStorage';
import AddressCard from '../../components/dashboard/AddressCard/AddressCard';
import AddressModal from '../../components/dashboard/AddressModal/AddressModal';
import styles from './AddressesPage.module.css';

/**
 * Addresses page — CRUD over the mock localStorage address book.
 */
export default function AddressesPage() {
  const [addresses, setAddresses] = useState(loadAddresses);
  const [modal, setModal] = useState({ open: false, editing: null });

  const persist = (next) => {
    setAddresses(next);
    saveAddresses(next);
  };

  const addNew = () => {
    setModal({ open: true, editing: null });
  };

  const save = (values) => {
    const id = values.id ?? `addr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const withDefault = values.isDefault
      ? addresses.map((a) => ({ ...a, isDefault: false }))
      : addresses;

    const exists = withDefault.some((a) => a.id === id);
    const next = exists
      ? withDefault.map((a) => (a.id === id ? { ...values, id, isDefault: values.isDefault || addresses.length === 1 } : a))
      : [...addresses, { ...values, id }];

    // Always keep exactly one default.
    if (!next.some((a) => a.isDefault) && next.length > 0) next[0].isDefault = true;
    persist(next);
  };

  const remove = (address) => {
    let next = addresses.filter((a) => a.id !== address.id);
    if (!next.some((a) => a.isDefault) && next.length > 0) next[0].isDefault = true;
    persist(next);
  };

  const setDefault = (address) => {
    persist(addresses.map((a) => ({ ...a, isDefault: a.id === address.id })));
  };

  const openEdit = (address) => setModal({ open: true, editing: address });

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.toolbar}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={styles.hint}>{addresses.length} saved address{addresses.length === 1 ? '' : 'es'}</p>
        <button type="button" className={styles.add} onClick={addNew}>
          + Add New Address
        </button>
      </motion.div>

      {addresses.length > 0 ? (
        <ul className={styles.grid}>
          {addresses.map((address) => (
            <li key={address.id} className={styles.cell}>
              <AddressCard
                address={address}
                onEdit={openEdit}
                onDelete={remove}
                onSetDefault={setDefault}
              />
            </li>
          ))}
        </ul>
      ) : (
        <motion.div
          className={styles.empty}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className={styles.emptyTitle}>No saved addresses.</p>
          <p className={styles.emptyLead}>Add a delivery address to make checkout a two-second ritual.</p>
          <button type="button" className={styles.add} onClick={addNew}>
            + Add New Address
          </button>
        </motion.div>
      )}

      <AddressModal
        open={modal.open}
        initial={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={save}
      />
    </div>
  );
}