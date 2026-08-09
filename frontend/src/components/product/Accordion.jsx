import { useState } from 'react';
import { cn } from '../../utils/cn';
import styles from './Accordion.module.css';

/**
 * Accessible accordion: one item open at a time, aria-expanded/aria-controls,
 * focus ring handled globally. The `defaultOpen` index is opened on mount.
 */
export default function Accordion({ items = [], className }) {
  const [openIndex, setOpenIndex] = useState(0);

  if (!items.length) return null;

  return (
    <div className={cn(styles.wrap, className)}>
      {items.map((item, index) => {
        const open = openIndex === index;
        const panelId = `${item.title.replace(/\s+/g, '-').toLowerCase()}-panel`;
        return (
          <div key={item.title} className={cn(styles.item, open && styles.open)}>
            <button
              type="button"
              id={`${panelId}-tab`}
              className={styles.header}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? -1 : index)}
            >
              <span>{item.title}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.icon}
                aria-hidden="true"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={`${panelId}-tab`}
              className={styles.panel}
            >
              <div className={styles.panelInner}>{item.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}