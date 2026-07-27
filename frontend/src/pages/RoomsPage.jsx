import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createRoomRequest, listRoomsRequest } from '../api/rooms'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert/Alert'
import { Badge } from '../components/Badge/Badge'
import { Button } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { FormField } from '../components/FormField/FormField'
import { getErrorMessage } from '../utils/apiErrors'

const emptyForm = { name: '', capacity: '', location: '', color: '#1e90ff' }

export function RoomsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)

  const roomsQuery = useQuery({ queryKey: ['rooms'], queryFn: listRoomsRequest })

  const createRoom = useMutation({
    mutationFn: createRoomRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setForm(emptyForm)
      setError(null)
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'No se pudo crear la sala.'))
    },
  })

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    createRoom.mutate({ ...form, capacity: Number(form.capacity) })
  }

  return (
    <div>
      <h1>Salas</h1>

      {roomsQuery.isLoading && <p>Cargando...</p>}
      {roomsQuery.isError && <p className="form-error">No se pudieron cargar las salas.</p>}

      {roomsQuery.data?.length === 0 && (
        <EmptyState title="No hay salones creados" description="Todavía no se cargó ningún salón." />
      )}

      {roomsQuery.data?.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Capacidad</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roomsQuery.data.map((room) => (
                <tr key={room.id}>
                  <td>
                    <span className="color-dot" style={{ backgroundColor: room.color }} />
                    {room.name}
                  </td>
                  <td>{room.capacity}</td>
                  <td>{room.location || '—'}</td>
                  <td>
                    <Badge variant={room.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td>
                    <Link to={`/bookings?room=${room.id}`}>Ver reservas</Link>
                    {' · '}
                    <Link to={`/rooms/${room.id}/schedule`}>Horario</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {user.role === 'superadmin' && (
        <Card>
          <h3>Nueva sala</h3>
          <form onSubmit={handleSubmit}>
            <FormField label="Nombre">
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
            </FormField>
            <FormField label="Capacidad">
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => updateField('capacity', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Ubicación">
              <input value={form.location} onChange={(e) => updateField('location', e.target.value)} />
            </FormField>
            <FormField label="Color">
              <input type="color" value={form.color} onChange={(e) => updateField('color', e.target.value)} />
            </FormField>
            <Alert variant="error">{error}</Alert>
            <Button type="submit" loading={createRoom.isPending}>
              <Plus size={16} aria-hidden="true" />
              Crear sala
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
