import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { cancelBookingRequest, listBookingsRequest } from '../api/bookings'
import { listRoomsRequest } from '../api/rooms'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert/Alert'
import { AvailabilityGrid } from '../components/AvailabilityGrid/AvailabilityGrid'
import { Badge } from '../components/Badge/Badge'
import { BookingFormModal } from '../components/BookingFormModal/BookingFormModal'
import { Button } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Modal } from '../components/Modal/Modal'
import { getErrorMessage } from '../utils/apiErrors'
import './BookingsPage.css'

function formatDateTime(value) {
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

export function BookingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const roomFilter = searchParams.get('room') ?? ''

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formPrefill, setFormPrefill] = useState(null)
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

  function openNewBookingModal() {
    setFormPrefill(null)
    setIsFormOpen(true)
  }

  function openCancelModal(booking) {
    setCancelError(null)
    setCancelTarget(booking)
  }

  return (
    <div>
      <p>
        <Link to="/">Volver</Link>
      </p>
      <h1>Reservas</h1>

      <Alert variant="success">{successMessage}</Alert>

      <Card>
        <AvailabilityGrid
          onSlotClick={(room, start, end) => {
            setFormPrefill({ room: room.id, start, end })
            setIsFormOpen(true)
          }}
          onBusyClick={openCancelModal}
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
        <Button onClick={openNewBookingModal} disabled={!user.company}>
          <Plus size={16} aria-hidden="true" />
          Nueva reserva
        </Button>
      </div>
      {!user.company && (
        <p className="field-error">Tu usuario no pertenece a ninguna empresa; no podés crear reservas.</p>
      )}

      {bookingsQuery.isLoading && <p>Cargando...</p>}
      {bookingsQuery.isError && <p className="form-error">No se pudieron cargar las reservas.</p>}

      {bookingsQuery.data?.length === 0 && (
        <EmptyState
          title="No hay reservas"
          description="No se encontraron reservas para el filtro seleccionado."
        />
      )}

      {bookingsQuery.data?.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sala</th>
                <th>Título</th>
                <th>Desde</th>
                <th>Hasta</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookingsQuery.data.map((booking) => {
                const room = roomsQuery.data?.find((r) => r.id === booking.room)
                const canCancel = Boolean(booking.user) && booking.status === 'confirmed'
                return (
                  <tr key={booking.id}>
                    <td>{room?.name ?? booking.room}</td>
                    <td>{booking.title ?? 'Reservado'}</td>
                    <td>{formatDateTime(booking.start_time)}</td>
                    <td>{formatDateTime(booking.end_time)}</td>
                    <td>
                      <Badge variant={booking.status}>
                        {booking.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                      </Badge>
                    </td>
                    <td>
                      {canCancel && (
                        <Button variant="danger" size="sm" onClick={() => openCancelModal(booking)}>
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

      <BookingFormModal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        rooms={roomsQuery.data ?? []}
        prefill={formPrefill}
        onCreated={() => setSuccessMessage('Reserva creada correctamente.')}
      />

      <Modal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancelar reserva">
        {cancelTarget && (
          <>
            <p>
              ¿Confirmás cancelar <strong>{cancelTarget.title ?? 'esta reserva'}</strong> (
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
