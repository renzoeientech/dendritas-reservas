import { CalendarClock, DoorOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Card } from '../components/Card/Card'
import './HomePage.css'

const ROLE_LABELS = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  member: 'Miembro',
}

export function HomePage() {
  const { user } = useAuth()

  return (
    <div>
      <h1>Hola, {user.first_name || user.email}</h1>
      <Card>
        <p>
          Empresa: <strong>{user.company?.name ?? 'Sin empresa asignada'}</strong>
        </p>
        <p>
          Rol: <strong>{ROLE_LABELS[user.role] ?? user.role}</strong>
        </p>
      </Card>

      <div className="home-quick-links">
        <Link to="/rooms" className="home-quick-link">
          <Card>
            <DoorOpen size={24} aria-hidden="true" />
            <h3>Salas</h3>
            <p>Ver salones y sus horarios habilitados.</p>
          </Card>
        </Link>
        <Link to="/bookings" className="home-quick-link">
          <Card>
            <CalendarClock size={24} aria-hidden="true" />
            <h3>Reservas</h3>
            <p>Ver disponibilidad y reservar un salón.</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
