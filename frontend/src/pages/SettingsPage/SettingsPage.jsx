import { motion } from 'framer-motion';
import SettingsPanel from '../../components/dashboard/SettingsPanel/SettingsPanel';
import styles from './SettingsPage.module.css';

/** Settings page — profile, notifications, theme and privacy. */
export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="page-kicker">Settings</p>
        <h1 className={styles.title}>Tune your account.</h1>
      </motion.header>
      <SettingsPanel />
    </div>
  );
}