import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import './Modal.css'

export function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    function handleClose() {
      onClose()
    }
    function handleBackdropClick(event) {
      if (event.target === dialog) {
        dialog.close()
      }
    }

    dialog.addEventListener('close', handleClose)
    dialog.addEventListener('click', handleBackdropClick)
    return () => {
      dialog.removeEventListener('close', handleClose)
      dialog.removeEventListener('click', handleBackdropClick)
    }
  }, [onClose])

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby={title ? 'modal-title' : undefined}>
      <div className="modal-header">
        {title && (
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
        )}
        <button type="button" className="modal-close" onClick={() => dialogRef.current?.close()} aria-label="Cerrar">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  )
}
