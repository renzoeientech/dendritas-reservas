import { useQuery } from '@tanstack/react-query'
import { Building2, CalendarClock, DoorOpen, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listBookingsRequest } from '../api/bookings'
import { listRoomsRequest } from '../api/rooms'
import { useAuth } from '../auth/AuthContext'
import { Badge } from '../components/Badge/Badge'
import { Card } from '../components/Card/Card'
import './HomePage.css'

const ROLE_LABELS = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  member: 'Miembro',
}

function todayKey() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function HomePage() {
  const { user } = useAuth()

  const roomsQuery = useQuery({ queryKey: ['rooms'], queryFn: listRoomsRequest })
  const todayBookingsQuery = useQuery({
    queryKey: ['bookings', 'today', todayKey()],
    queryFn: () => listBookingsRequest({ from: todayKey(), to: todayKey() }),
  })

  const activeRoomsCount = roomsQuery.data?.filter((room) => room.is_active).length
  const todayBookingsCount = todayBookingsQuery.data?.filter((b) => b.status === 'confirmed').length

  return (
    <div className="home-page">
      <h1>
        <span className="home-greeting-muted">Hola,</span>{' '}
        <span className="home-greeting-name">{user.first_name || user.email}</span>
      </h1>

      <Card className="home-user-card">
        <div className="home-user-row">
          <Building2 size={18} aria-hidden="true" />
          <span>Empresa</span>
          {user.company ? (
            <strong>{user.company.name}</strong>
          ) : (
            <Badge variant="warning">Sin empresa asignada</Badge>
          )}
        </div>
        <div className="home-user-row">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Rol</span>
          <strong>{ROLE_LABELS[user.role] ?? user.role}</strong>
        </div>
      </Card>

      <div className="home-quick-links">
        <Link to="/rooms" className="home-quick-link">
          <Card>
            <span className="home-quick-link-icon">
              <DoorOpen size={22} aria-hidden="true" />
            </span>
            <h3>Salas</h3>
            <p>Ver salones y sus horarios habilitados.</p>
            <p className="home-quick-fact">
              {activeRoomsCount != null
                ? `${activeRoomsCount} ${activeRoomsCount === 1 ? 'sala disponible' : 'salas disponibles'}`
                : '\u00a0'}
            </p>
          </Card>
        </Link>
        <Link to="/bookings" className="home-quick-link">
          <Card>
            <span className="home-quick-link-icon">
              <CalendarClock size={22} aria-hidden="true" />
            </span>
            <h3>Reservas</h3>
            <p>Ver disponibilidad y reservar un salón.</p>
            <p className="home-quick-fact">
              {todayBookingsCount != null
                ? `${todayBookingsCount} ${todayBookingsCount === 1 ? 'reserva hoy' : 'reservas hoy'}`
                : '\u00a0'}
            </p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
