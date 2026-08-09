import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import AuthField from '../../auth/AuthField/AuthField';
import styles from './AddressModal.module.css';

const EASE_OUT = [0.22, 1, 0.36, 1];

const EMPTY = {
  name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

const PIN_RE = /^\d{6}$/;

function validate(values) {
  const errors = {};

  if (!values.name.trim()) errors.name = 'Full name is required.';
  if (!values.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!/^[+()\d][\s\d()-]{6,16}$/.test(values.phone.trim())) {
    errors.phone = 'Enter a valid phone number.';
  }

  if (!values.address.trim()) {
    errors.address = 'Street address is required.';
  } else if (values.address.trim().length < 8) {
    errors.address = 'Enter your full street address.';
  }

  if (!values.city.trim()) errors.city = 'City is required.';
  if (!values.state.trim()) errors.state = 'State is required.';

  if (!values.pincode.trim()) {
    errors.pincode = 'Pincode is required.';
  } else if (!PIN_RE.test(values.pincode.trim())) {
    errors.pincode = 'Enter a valid 6-digit pincode.';
  }

  return errors;
}

/**
 * Accessible add/edit address modal — focus-trapped, ESC/backdrop to close,
 * inline validation, saves through the parent so storage stays centralized.
 */
export default function AddressModal({ open, onClose, initial = null, onSave }) {
  const panelRef = useFocusTrap(open);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const editing = Boolean(initial?.id);

  // Load the address being edited whenever the modal opens.
  useEffect(() => {
    if (open) {
      setValues(initial ? { ...EMPTY, ...initial } : EMPTY);
      setErrors({});
      setTouched({});
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const setField = (field) => (e) => {
    const next = { ...values, [field]: e.target.value };
    setValues(next);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleBlur = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validate(values);
    setErrors((prev) => ({ ...prev, [field]: errs[field] || '' }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    onSave?.({
      ...values,
      name: values.name.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      pincode: values.pincode.trim(),
      ...(initial?.id ? { id: initial.id } : {}),
    });
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            ref={panelRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-modal-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
          >
            <header className={styles.head}>
              <div>
                <p className={styles.kicker}>Address</p>
                <h2 id="address-modal-title" className={styles.title}>
                  {editing ? 'Edit address' : 'Add address'}
                </h2>
              </div>
              <button type="button" className={styles.close} onClick={onClose} aria-label="Close address form">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 5l14 14" />
                  <path d="M19 5L5 19" />
                </svg>
              </button>
            </header>

            <form className={styles.form} onSubmit={onSubmit} noValidate aria-label="Address form">
              <AuthField
                id="addr-name"
                label="Full Name"
                type="text"
                value={values.name}
                onChange={setField('name')}
                onBlur={handleBlur('name')}
                error={touched.name ? errors.name : ''}
                autoComplete="name"
                required
              />
              <AuthField
                id="addr-phone"
                label="Phone"
                type="tel"
                value={values.phone}
                onChange={setField('phone')}
                onBlur={handleBlur('phone')}
                error={touched.phone ? errors.phone : ''}
                autoComplete="tel"
                required
              />
              <AuthField
                id="addr-address"
                label="Address"
                type="text"
                value={values.address}
                onChange={setField('address')}
                onBlur={handleBlur('address')}
                error={touched.address ? errors.address : ''}
                placeholder="House no., street, area"
                autoComplete="street-address"
                required
              />

              <div className={styles.grid}>
                <AuthField
                  id="addr-city"
                  label="City"
                  type="text"
                  value={values.city}
                  onChange={setField('city')}
                  onBlur={handleBlur('city')}
                  error={touched.city ? errors.city : ''}
                  autoComplete="address-level2"
                  required
                />
                <AuthField
                  id="addr-state"
                  label="State"
                  type="text"
                  value={values.state}
                  onChange={setField('state')}
                  onBlur={handleBlur('state')}
                  error={touched.state ? errors.state : ''}
                  autoComplete="address-level1"
                  required
                />
              </div>

              <AuthField
                id="addr-pincode"
                label="Pincode"
                type="text"
                inputMode="numeric"
                value={values.pincode}
                onChange={setField('pincode')}
                onBlur={handleBlur('pincode')}
                error={touched.pincode ? errors.pincode : ''}
                autoComplete="postal-code"
                required
              />

              <label className={styles.defaultRow}>
                <input
                  type="checkbox"
                  checked={Boolean(values.isDefault)}
                  onChange={(e) => setValues((v) => ({ ...v, isDefault: e.target.checked }))}
                />
                <span>Set as default address</span>
              </label>

              <div className={styles.actions}>
                <button type="button" className={styles.cancel} onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className={styles.save}>
                  {editing ? 'Save Changes' : 'Add Address'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}