import { motion } from 'framer-motion';
import styles from './AddressCard.module.css';

/**
 * A single saved address — optional Default badge plus edit / delete actions.
 */
export default function AddressCard({ address, onEdit, onDelete, onSetDefault }) {
  const addr = address ?? {};
  const lines = [
    addr.name,
    addr.phone,
    addr.address,
    [addr.city, addr.state].filter(Boolean).join(', '),
    [addr.pincode, addr.country].filter(Boolean).join(' · '),
  ].filter(Boolean);

  return (
    <motion.article
      className={styles.card}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={styles.head}>
        <h3 className={styles.name}>{addr.name || 'Untitled'}</h3>
        {addr.isDefault && (
          <span className={styles.defaultBadge} aria-label="Default address">
            Default
          </span>
        )}
      </header>

      <address className={styles.body}>
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>

      <div className={styles.actions}>
        {!addr.isDefault && (
          <button type="button" className={styles.makeDefault} onClick={() => onSetDefault?.(addr)}>
            Make default
          </button>
        )}
        <span className={styles.spacer} aria-hidden="true" />
        <button type="button" className={styles.ghost} onClick={() => onEdit?.(addr)}>
          Edit
        </button>
        <button type="button" className={styles.danger} onClick={() => onDelete?.(addr)}>
          Delete
        </button>
      </div>
    </motion.article>
  );
}