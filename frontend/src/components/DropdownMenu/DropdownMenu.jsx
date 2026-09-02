import { MoreVertical } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './DropdownMenu.css'

const MARGIN = 8

export function DropdownMenu({ items, align = 'end' }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  // Mide el trigger y el panel ya montado (oculto) para decidir si conviene
  // abrir hacia arriba o hacia abajo según el espacio real disponible, y
  // ubica el panel con position:fixed (portal a <body>) para que no quede
  // recortado por el overflow-x:auto de la tabla que lo contiene.
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const panelHeight = panelRef.current?.offsetHeight ?? 0
    const panelWidth = panelRef.current?.offsetWidth ?? 0
    const spaceBelow = window.innerHeight - triggerRect.bottom
    const openUp = panelHeight + MARGIN > spaceBelow && triggerRect.top > panelHeight + MARGIN

    const left =
      align === 'end'
        ? Math.max(MARGIN, triggerRect.right - panelWidth)
        : triggerRect.left

    setPosition({
      left,
      top: openUp ? triggerRect.top - panelHeight - 4 : triggerRect.bottom + 4,
    })
  }, [open, align, items.length])

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event) {
      const inTrigger = containerRef.current?.contains(event.target)
      const inPanel = panelRef.current?.contains(event.target)
      if (!inTrigger && !inPanel) setOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    // Ante scroll/resize la posición calculada queda desactualizada; cerrar
    // es más simple y confiable que recalcular en cada evento.
    function handleReflow() {
      setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleReflow, true)
    window.addEventListener('resize', handleReflow)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleReflow, true)
      window.removeEventListener('resize', handleReflow)
    }
  }, [open])

  return (
    <div className="dropdown-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="dropdown-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Más opciones"
      >
        <MoreVertical size={20} fill="currentColor" aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="dropdown-menu-panel"
            role="menu"
            style={{
              top: position ? `${position.top}px` : '-9999px',
              left: position ? `${position.left}px` : '-9999px',
              visibility: position ? 'visible' : 'hidden',
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`dropdown-menu-item${item.danger ? ' dropdown-menu-item-danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
