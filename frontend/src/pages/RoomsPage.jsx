import { useQuery } from '@tanstack/react-query'
import {
  CalendarClock,
  Clock,
  Coffee,
  ImageOff,
  Pencil,
  Plus,
  Presentation,
  Projector,
  Snowflake,
  Tv,
  Users,
  Wifi,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listRoomsRequest } from '../api/rooms'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert/Alert'
import { Button } from '../components/Button/Button'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { RoomFormModal } from '../components/RoomFormModal/RoomFormModal'
import './RoomsPage.css'

const AMENITY_ICONS = {
  tv: { icon: Tv, label: 'TV' },
  pizarra: { icon: Presentation, label: 'Pizarra' },
  proyector: { icon: Projector, label: 'Proyector' },
  wifi: { icon: Wifi, label: 'Wifi' },
  aire_acondicionado: { icon: Snowflake, label: 'Aire acondicionado' },
  cafetera: { icon: Coffee, label: 'Cafetera' },
}

// Filtra ubicaciones vacías o que son solo puntuación/espacios (ej. "." cargado
// como placeholder), para no mostrar el separador " · " sin nada detrás.
function hasMeaningfulLocation(location) {
  return Boolean(location && /[a-zA-Z0-9]/.test(location))
}

export function RoomsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    if (!successMessage) return
    const timeout = setTimeout(() => setSuccessMessage(null), 4000)
    return () => clearTimeout(timeout)
  }, [successMessage])

  const roomsQuery = useQuery({ queryKey: ['rooms'], queryFn: listRoomsRequest })
  const canManage = user.role === 'superadmin'

  function openNewRoomModal() {
    setEditingRoom(null)
    setIsFormOpen(true)
  }

  function openEditRoomModal(room) {
    setEditingRoom(room)
    setIsFormOpen(true)
  }

  return (
    <div>
      <div className="rooms-toolbar">
        <h1>Salas</h1>
        {canManage && (
          <Button onClick={openNewRoomModal}>
            <Plus size={16} aria-hidden="true" />
            Nueva sala
          </Button>
        )}
      </div>

      <Alert variant="success">{successMessage}</Alert>

      {roomsQuery.isLoading && <p>Cargando...</p>}
      {roomsQuery.isError && <p className="form-error">No se pudieron cargar las salas.</p>}

      {roomsQuery.data?.length === 0 && (
        <EmptyState title="No hay salones creados" description="Todavía no se cargó ningún salón." />
      )}

      {roomsQuery.data?.length > 0 && (
        <div className="rooms-grid">
          {roomsQuery.data.map((room) => (
            <div key={room.id} className="room-card">
              <div className="room-card-photo">
                {room.photo ? (
                  <img src={room.photo} alt={room.name} />
                ) : (
                  <div className="room-card-photo-placeholder">
                    <ImageOff size={24} aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="room-card-body">
                <h3>{room.name}</h3>
                <p className="room-card-meta">
                  <Users size={14} aria-hidden="true" /> Capacidad para {room.capacity}{' '}
                  {room.capacity === 1 ? 'persona' : 'personas'}
                  {hasMeaningfulLocation(room.location) ? ` · ${room.location}` : ''}
                </p>

                {room.amenities?.length > 0 && (
                  <div className="room-card-amenities">
                    {room.amenities.map((amenity) => {
                      const meta = AMENITY_ICONS[amenity]
                      if (!meta) return null
                      const Icon = meta.icon
                      return (
                        <span key={amenity} className="room-amenity-badge" title={meta.label}>
                          <Icon size={13} aria-hidden="true" />
                          {meta.label}
                        </span>
                      )
                    })}
                  </div>
                )}

                <div className="room-card-actions">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/bookings?room=${room.id}`)}>
                    <CalendarClock size={14} aria-hidden="true" />
                    Ver reservas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/rooms/${room.id}/schedule`)}>
                    <Clock size={14} aria-hidden="true" />
                    Horario
                  </Button>
                  {canManage && (
                    <Button variant="ghost" size="sm" onClick={() => openEditRoomModal(room)}>
                      <Pencil size={14} aria-hidden="true" />
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <RoomFormModal
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          room={editingRoom}
          onSaved={() => setSuccessMessage(editingRoom ? 'Sala actualizada correctamente.' : 'Sala creada correctamente.')}
        />
      )}
    </div>
  )
}
