import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRoomScheduleRequest, listRoomsRequest, putRoomScheduleRequest } from '../api/rooms'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert/Alert'
import { Button } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { getErrorMessage } from '../utils/apiErrors'

const WEEKDAYS = [
  { value: 0, label: 'Lunes' },
  { value: 1, label: 'Martes' },
  { value: 2, label: 'Miércoles' },
  { value: 3, label: 'Jueves' },
  { value: 4, label: 'Viernes' },
  { value: 5, label: 'Sábado' },
  { value: 6, label: 'Domingo' },
]

function emptyDays() {
  return WEEKDAYS.map(() => ({ enabled: false, start_time: '09:00', end_time: '18:00' }))
}

export function RoomSchedulePage() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = user.role === 'superadmin'

  const roomsQuery = useQuery({ queryKey: ['rooms'], queryFn: listRoomsRequest })
  const room = roomsQuery.data?.find((r) => String(r.id) === roomId)

  const scheduleQuery = useQuery({
    queryKey: ['room-schedule', roomId],
    queryFn: () => getRoomScheduleRequest(roomId),
  })

  const [days, setDays] = useState(emptyDays)
  const [error, setError] = useState(null)

  // The API stores one open range per weekday at most for now; a schedule with
  // multiple ranges the same day would only show the last one here.
  useEffect(() => {
    if (!scheduleQuery.data) return
    const next = emptyDays()
    for (const entry of scheduleQuery.data) {
      next[entry.weekday] = {
        enabled: true,
        start_time: entry.start_time.slice(0, 5),
        end_time: entry.end_time.slice(0, 5),
      }
    }
    setDays(next)
  }, [scheduleQuery.data])

  const saveSchedule = useMutation({
    mutationFn: putRoomScheduleRequest.bind(null, roomId),
    onSuccess: (data) => {
      queryClient.setQueryData(['room-schedule', roomId], data)
      setError(null)
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'No se pudo guardar el horario.'))
    },
  })

  function updateDay(index, patch) {
    setDays((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const payload = days
      .map((day, weekday) => ({ ...day, weekday }))
      .filter((day) => day.enabled)
      .map(({ weekday, start_time, end_time }) => ({ weekday, start_time, end_time }))
    saveSchedule.mutate(payload)
  }

  return (
    <div>
      <p>
        <Link to="/rooms">← Volver a salas</Link>
      </p>
      <h1>Horario semanal{room ? ` — ${room.name}` : ''}</h1>

      {scheduleQuery.isLoading && <p>Cargando...</p>}
      {scheduleQuery.isError && <p className="form-error">No se pudo cargar el horario.</p>}

      {scheduleQuery.data && (
        <Card>
          <form onSubmit={handleSubmit}>
            {WEEKDAYS.map((weekday, index) => (
              <label key={weekday.value} className="schedule-row">
                <input
                  type="checkbox"
                  checked={days[index].enabled}
                  disabled={!canEdit}
                  onChange={(e) => updateDay(index, { enabled: e.target.checked })}
                />
                <span className="schedule-day">{weekday.label}</span>
                <input
                  type="time"
                  aria-label={`Hora de inicio ${weekday.label}`}
                  value={days[index].start_time}
                  disabled={!canEdit || !days[index].enabled}
                  onChange={(e) => updateDay(index, { start_time: e.target.value })}
                />
                <span>a</span>
                <input
                  type="time"
                  aria-label={`Hora de fin ${weekday.label}`}
                  value={days[index].end_time}
                  disabled={!canEdit || !days[index].enabled}
                  onChange={(e) => updateDay(index, { end_time: e.target.value })}
                />
              </label>
            ))}

            <Alert variant="error">{error}</Alert>
            {canEdit && (
              <Button type="submit" loading={saveSchedule.isPending}>
                Guardar horario
              </Button>
            )}
          </form>
        </Card>
      )}
    </div>
  )
}
