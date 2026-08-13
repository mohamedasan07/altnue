import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import styles from './DeleteModal.module.css'

function DeleteModal({ open, product, onClose, onConfirm }) {
  const [prevOpen, setPrevOpen] = useState(open)
  const [deleting, setDeleting] = useState(false)

  // Reset the button state each time the modal opens (derived-state pattern).
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setDeleting(false)
  }

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm(product)
      onClose()
    } catch {
      // Error already surfaced by the parent (toast); keep the modal open.
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete Product" size="sm">
      <p className={styles.copy}>
        Are you sure you want to delete{' '}
        <strong className={styles.name}>{product?.name}</strong>? This action
        cannot be undone.
      </p>

      <footer className={styles.footer}>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={deleting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={deleting}
          disabled={deleting}
          onClick={handleConfirm}
        >
          Delete
        </Button>
      </footer>
    </Modal>
  )
}

export default DeleteModal
