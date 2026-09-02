import { Navigate } from 'react-router-dom'
import { Spinner } from '../components/Spinner/Spinner'
import { AppShell } from '../layout/AppShell'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ children, roles }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="protected-route-loading">
        <Spinner size={24} />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return <AppShell>{children}</AppShell>
}
