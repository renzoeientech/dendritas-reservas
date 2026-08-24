import { AlertCircle, CheckCircle2 } from 'lucide-react'
import './Alert.css'

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
}

export function Alert({ variant = 'error', children }) {
  if (!children) return null
  const Icon = ICONS[variant]
  return (
    <div className={`alert alert-${variant}`} role={variant === 'error' ? 'alert' : 'status'} aria-live="polite">
      <Icon size={18} aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
