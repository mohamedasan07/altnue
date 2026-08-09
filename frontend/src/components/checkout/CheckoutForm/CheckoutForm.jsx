import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { CountriesList } from '../../../hooks/useCheckout';
import styles from './CheckoutForm.module.css';

const EASE_OUT = [0.22, 1, 0.36, 1];

const Field = memo(function Field({ label, name, type = 'text', value, error, touched, onChange, onBlur, autoComplete, inputMode, select, children, optional }) {
  const id = `checkout-${name}`;
  const invalid = Boolean(error) && touched;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <span className={styles.optional}>Optional</span>}
      </label>

      {select ? (
        <select
          id={id}
          name={name}
          className={cn(styles.control, invalid && styles.controlError)}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
        >
          {children}
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={cn(styles.control, invalid && styles.controlError)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
        />
      )}

      {invalid && (
        <motion.p
          id={`${id}-error`}
          className={styles.error}
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
});

/**
 * Shipping information form with per-field inline validation.
 * `setField(name)` and `handleBlur(name)` come from useCheckout.
 */
export default function CheckoutForm({ values, errors, touched, setField, handleBlur }) {
  return (
    <motion.form
      noValidate
      className={styles.form}
      aria-label="Shipping information"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      <div className={styles.grid2}>
        <Field
          label="First name"
          name="firstName"
          value={values.firstName}
          error={errors.firstName}
          touched={touched.firstName}
          onChange={setField('firstName')}
          onBlur={handleBlur('firstName')}
          autoComplete="given-name"
        />
        <Field
          label="Last name"
          name="lastName"
          value={values.lastName}
          error={errors.lastName}
          touched={touched.lastName}
          onChange={setField('lastName')}
          onBlur={handleBlur('lastName')}
          autoComplete="family-name"
        />
      </div>

      <div className={styles.grid2}>
        <Field
          label="Phone"
          name="phone"
          type="tel"
          inputMode="tel"
          value={values.phone}
          error={errors.phone}
          touched={touched.phone}
          onChange={setField('phone')}
          onBlur={handleBlur('phone')}
          autoComplete="tel-national"
        />
        <Field
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          value={values.email}
          error={errors.email}
          touched={touched.email}
          onChange={setField('email')}
          onBlur={handleBlur('email')}
          autoComplete="email"
        />
      </div>

      <Field
        label="Address"
        name="address"
        value={values.address}
        error={errors.address}
        touched={touched.address}
        onChange={setField('address')}
        onBlur={handleBlur('address')}
        autoComplete="street-address"
      />

      <Field
        label="Apartment, suite, unit"
        name="apartment"
        value={values.apartment}
        error={errors.apartment}
        touched={touched.apartment}
        onChange={setField('apartment')}
        onBlur={handleBlur('apartment')}
        autoComplete="address-line2"
        optional
      />

      <div className={styles.grid2}>
        <Field
          label="City"
          name="city"
          value={values.city}
          error={errors.city}
          touched={touched.city}
          onChange={setField('city')}
          onBlur={handleBlur('city')}
          autoComplete="address-level2"
        />
        <Field
          label="State"
          name="state"
          value={values.state}
          error={errors.state}
          touched={touched.state}
          onChange={setField('state')}
          onBlur={handleBlur('state')}
          autoComplete="address-level1"
        />
      </div>

      <div className={styles.grid2}>
        <Field
          label="Pincode"
          name="pincode"
          inputMode="numeric"
          value={values.pincode}
          error={errors.pincode}
          touched={touched.pincode}
          onChange={setField('pincode')}
          onBlur={handleBlur('pincode')}
          autoComplete="postal-code"
        />
        <Field
          label="Country"
          name="country"
          select
          value={values.country}
          error={errors.country}
          touched={touched.country}
          onChange={setField('country')}
          onBlur={handleBlur('country')}
          autoComplete="country-name"
        >
          {CountriesList.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </Field>
      </div>
    </motion.form>
  );
}