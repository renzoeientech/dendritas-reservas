import { useQueries, useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { listBookingsRequest } from '../../api/bookings'
import { getRoomScheduleRequest, listRoomsRequest } from '../../api/rooms'
import { Button } from '../Button/Button'
import { EmptyState } from '../EmptyState/EmptyState'
import { Spinner } from '../Spinner/Spinner'
import './AvailabilityGrid.css'

const START_HOUR = 7
const END_HOUR = 21 // exclusivo: la última franja mostrada es 20:00-21:00

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toBackendWeekday(date) {
  const jsDay = date.getDay() // 0=domingo..6=sábado
  return (jsDay + 6) % 7 // 0=lunes..6=domingo, igual que el backend
}

function timeToMinutes(value) {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

function addDays(date, amount) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function AvailabilityGrid({ onSlotClick, onBusyClick }) {
  const [date, setDate] = useState(() => new Date())
  const dateKey = formatDateKey(date)
  const weekday = toBackendWeekday(date)

  const roomsQuery = useQuery({ queryKey: ['rooms'], queryFn: listRoomsRequest })
  const activeRooms = useMemo(() => roomsQuery.data?.filter((room) => room.is_active) ?? [], [roomsQuery.data])

  const scheduleQueries = useQueries({
    queries: activeRooms.map((room) => ({
      queryKey: ['room-schedule', room.id],
      queryFn: () => getRoomScheduleRequest(room.id),
      enabled: activeRooms.length > 0,
    })),
  })

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'day', dateKey],
    queryFn: () => listBookingsRequest({ from: dateKey, to: dateKey }),
  })

  const isLoading =
    roomsQuery.isLoading || bookingsQuery.isLoading || scheduleQueries.some((q) => q.isLoading)

  const hours = useMemo(() => {
    const list = []
    for (let h = START_HOUR; h < END_HOUR; h++) list.push(h)
    return list
  }, [])

  function cellStatus(room, roomIndex, hour) {
    const schedule = scheduleQueries[roomIndex]?.data ?? []
    const withinSchedule = schedule.some(
      (entry) =>
        entry.weekday === weekday &&
        timeToMinutes(entry.start_time) <= hour * 60 &&
        timeToMinutes(entry.end_time) >= (hour + 1) * 60
    )
    if (!withinSchedule) {
      return { status: 'closed' }
    }

    const cellStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0)
    const cellEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour + 1, 0, 0)
    const booking = (bookingsQuery.data ?? []).find(
      (b) =>
        b.room === room.id &&
        b.status === 'confirmed' &&
        new Date(b.start_time) < cellEnd &&
        new Date(b.end_time) > cellStart
    )
    if (booking) {
      return { status: 'busy', booking, cellStart, cellEnd }
    }
    return { status: 'free', cellStart, cellEnd }
  }

  return (
    <div className="availability-grid">
      <div className="availability-grid-toolbar">
        <div className="availability-grid-nav">
          <Button variant="ghost" size="sm" onClick={() => setDate((d) => addDays(d, -1))} aria-label="Día anterior">
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <span className="availability-grid-date">
            <CalendarDays size={16} aria-hidden="true" />
            {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setDate((d) => addDays(d, 1))} aria-label="Día siguiente">
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setDate(new Date())}>
          Hoy
        </Button>
      </div>

      {isLoading && (
        <p className="availability-grid-loading">
          <Spinner /> Cargando disponibilidad...
        </p>
      )}

      {!isLoading && activeRooms.length === 0 && (
        <EmptyState title="No hay salones activos" description="Creá una sala para poder ver su disponibilidad." />
      )}

      {!isLoading && activeRooms.length > 0 && (
        <div className="table-scroll">
          <div
            className="availability-grid-table"
            style={{ gridTemplateColumns: `10rem repeat(${hours.length}, minmax(3.25rem, 1fr))` }}
          >
            <div className="availability-grid-corner" />
            {hours.map((hour) => (
              <div key={hour} className="availability-grid-hour">
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}

            {activeRooms.map((room, roomIndex) => (
              <Fragment key={room.id}>
                <div className="availability-grid-room">
                  <span className="color-dot" style={{ backgroundColor: room.color }} />
                  {room.name}
                </div>
                {hours.map((hour) => {
                  const cell = cellStatus(room, roomIndex, hour)
                  const clickableFree = Boolean(onSlotClick) && cell.status === 'free'
                  const clickableBusy =
                    Boolean(onBusyClick) && cell.status === 'busy' && Boolean(cell.booking.user)
                  const title =
                    cell.status === 'busy'
                      ? cell.booking.title
                        ? `${cell.booking.title} (${new Date(cell.booking.start_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}–${new Date(cell.booking.end_time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })})${clickableBusy ? ' — clic para cancelar' : ''}`
                        : 'Ocupada'
                      : cell.status === 'closed'
                        ? 'Fuera de horario'
                        : 'Libre'
                  const className = `availability-grid-cell availability-grid-cell-${cell.status}`
                  const key = `${room.id}-${hour}`

                  if (clickableFree) {
                    return (
                      <button
                        key={key}
                        type="button"
                        className={className}
                        title={title}
                        onClick={() => onSlotClick(room, cell.cellStart, cell.cellEnd)}
                      />
                    )
                  }
                  if (clickableBusy) {
                    return (
                      <button
                        key={key}
                        type="button"
                        className={className}
                        title={title}
                        onClick={() => onBusyClick(cell.booking)}
                      />
                    )
                  }
                  return <div key={key} className={className} title={title} />
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
