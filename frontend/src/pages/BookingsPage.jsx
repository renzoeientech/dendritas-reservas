import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cancelBookingRequest, listBookingsRequest } from '../api/bookings'
import { listRoomsRequest } from '../api/rooms'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert/Alert'
import { BookingCalendar } from '../components/BookingCalendar/BookingCalendar'
import { Button } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Modal } from '../components/Modal/Modal'
import { getErrorMessage } from '../utils/apiErrors'
import './BookingsPage.css'

function formatDateTime(value) {
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function hasMeaningfulTitle(value) {
  return Boolean(value && /[a-zA-Z0-9]/.test(value))
}

// `title` ausente = reserva de otra empresa, oculta por privacidad ("Reservado").
// `title` presente pero sin contenido real (vacío, espacios, solo puntuación) = dato inválido.
function titleDisplay(title) {
  if (title === undefined) return 'Reservado'
  return hasMeaningfulTitle(title) ? title : '(sin título)'
}

export function BookingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const roomFilter = searchParams.get('room') ?? ''

  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelError, setCancelError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    if (!successMessage) return
    const timeout = setTimeout(() => setSuccessMessage(null), 4000)
    return () => clearTimeout(timeout)
  }, [successMessage])

  const roomsQuery = useQuery({ queryKey: ['rooms'], queryFn: listRoomsRequest })
  const bookingsQuery = useQuery({
    queryKey: ['bookings', roomFilter],
    queryFn: () => listBookingsRequest({ room: roomFilter || undefined }),
  })
  // Las reservas canceladas no se muestran: al cancelar, la fila desaparece de la pantalla.
  const activeBookings = bookingsQuery.data?.filter((booking) => booking.status === 'confirmed')

  const cancelBooking = useMutation({
    mutationFn: cancelBookingRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setCancelTarget(null)
      setCancelError(null)
      setSuccessMessage('Reserva cancelada correctamente.')
    },
    onError: (err) => {
      setCancelError(getErrorMessage(err, 'No se pudo cancelar la reserva.'))
    },
  })

  function handleRoomFilterChange(value) {
    if (value) {
      setSearchParams({ room: value })
    } else {
      setSearchParams({})
    }
  }

  function openCancelModal(booking) {
    setCancelError(null)
    setCancelTarget(booking)
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="back-button" onClick={() => navigate(roomFilter ? '/rooms' : '/')}>
        <ArrowLeft size={16} aria-hidden="true" />
        Volver
      </Button>
      <h1>Reservas</h1>

      <Alert variant="success">{successMessage}</Alert>

      <Card>
        <BookingCalendar
          rooms={roomsQuery.data ?? []}
          user={user}
          initialRoomId={roomFilter}
          onCreated={() => setSuccessMessage('Reserva creada correctamente.')}
        />
      </Card>

      <h2>Detalle de reservas</h2>
      <div className="bookings-toolbar">
        <label>
          Filtrar por sala
          <select value={roomFilter} onChange={(e) => handleRoomFilterChange(e.target.value)}>
            <option value="">Todas</option>
            {roomsQuery.data?.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!user.company && user.role !== 'superadmin' && (
        <p className="field-error">Tu usuario no pertenece a ninguna empresa; no podés crear reservas.</p>
      )}

      {bookingsQuery.isLoading && <p>Cargando...</p>}
      {bookingsQuery.isError && <p className="form-error">No se pudieron cargar las reservas.</p>}

      {activeBookings?.length === 0 && (
        <EmptyState
          title="No hay reservas"
          description="No se encontraron reservas para el filtro seleccionado."
        />
      )}

      {activeBookings?.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sala</th>
                <th>Empresa</th>
                <th>Título</th>
                <th>Desde</th>
                <th>Hasta</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activeBookings.map((booking) => {
                const room = roomsQuery.data?.find((r) => r.id === booking.room)
                const canCancel = Boolean(booking.user)
                return (
                  <tr key={booking.id}>
                    <td>{room?.name ?? booking.room}</td>
                    <td>{booking.company?.name ?? '—'}</td>
                    <td>{titleDisplay(booking.title)}</td>
                    <td>{formatDateTime(booking.start_time)}</td>
                    <td>{formatDateTime(booking.end_time)}</td>
                    <td>
                      {canCancel && (
                        <Button variant="danger-outline" size="sm" onClick={() => openCancelModal(booking)}>
                          Cancelar
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancelar reserva">
        {cancelTarget && (
          <>
            <p>
              ¿Confirmás cancelar <strong>{titleDisplay(cancelTarget.title)}</strong> (
              {formatDateTime(cancelTarget.start_time)} – {formatDateTime(cancelTarget.end_time)})?
            </p>
            <Alert variant="error">{cancelError}</Alert>
            <div className="booking-form-actions">
              <Button variant="secondary" onClick={() => setCancelTarget(null)}>
                Volver
              </Button>
              <Button
                variant="danger"
                loading={cancelBooking.isPending}
                onClick={() => cancelBooking.mutate(cancelTarget.id)}
              >
                Sí, cancelar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
