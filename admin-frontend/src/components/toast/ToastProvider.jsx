import { useCallback, useMemo, useState } from 'react'
import {
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiX,
} from 'react-icons/fi'
import { ToastContext } from './toastContext'
import classNames from '../../utils/classNames'
import styles from './Toast.module.css'

const TYPE_META = {
  success: { icon: FiCheckCircle },
  error: { icon: FiAlertCircle },
  info: { icon: FiInfo },
}

let toastSequence = 0

/**
 * Global toast notifications. `showToast(message, type)` accepts
 * type "success" | "error" | "info". Toasts auto-dismiss after 4s.
 */
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = ++toastSequence
      setToasts((current) => [...current, { id, message, type }])
      window.setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className={styles.container}
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const Icon = TYPE_META[toast.type]?.icon || TYPE_META.info.icon
          return (
            <div
              key={toast.id}
              className={classNames(styles.toast, styles[toast.type])}
              role="status"
            >
              <Icon size={18} className={styles.icon} aria-hidden="true" />
              <span className={styles.message}>{toast.message}</span>
              <button
                type="button"
                className={styles.close}
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <FiX size={16} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
