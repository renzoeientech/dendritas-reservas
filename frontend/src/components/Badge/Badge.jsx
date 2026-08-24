import './Badge.css'

const LABELS = {
  free: 'Libre',
  busy: 'Ocupada',
  closed: 'Fuera de horario',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  active: 'Activa',
  inactive: 'Inactiva',
}

export function Badge({ variant, children, className = '' }) {
  return <span className={`badge badge-${variant} ${className}`}>{children ?? LABELS[variant] ?? variant}</span>
}
