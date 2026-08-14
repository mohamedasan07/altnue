import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAddresses } from '../../hooks/useAddresses';
import AddressCard from '../../components/dashboard/AddressCard/AddressCard';
import AddressModal from '../../components/dashboard/AddressModal/AddressModal';
import styles from './AddressesPage.module.css';

/**
 * Addresses page — CRUD against the Sprint 21.2 address-book API
 * (exactly-one-default is enforced server-side and mirrored in the hook).
 */
export default function AddressesPage() {
  const {
    addresses,
    status,
    error,
    addAddress,
    updateAddressById,
    removeAddress,
    setDefaultAddress,
  } = useAddresses();
  const [modal, setModal] = useState({ open: false, editing: null });

  const addNew = () => setModal({ open: true, editing: null });
  const openEdit = (address) => setModal({ open: true, editing: address });
  const closeModal = () => setModal({ open: false, editing: null });

  const save = async (values) => {
    if (values.id) {
      await updateAddressById(values.id, values);
    } else {
      await addAddress(values);
    }
  };

  const remove = async (address) => {
    await removeAddress(address.id);
  };

  const setDefault = async (address) => {
    await setDefaultAddress(address.id);
  };

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.toolbar}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={styles.hint}>
          {addresses.length} saved address{addresses.length === 1 ? '' : 'es'}
        </p>
        <button type="button" className={styles.add} onClick={addNew}>
          + Add New Address
        </button>
      </motion.div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {status === 'loading' ? (
        <p className={styles.hint}>Loading your addresses…</p>
      ) : addresses.length > 0 ? (
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
        onClose={closeModal}
        onSave={save}
      />
    </div>
  );
}