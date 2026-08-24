import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createBookingRequest, listBookingsRequest } from '../../api/bookings'
import { listCompaniesRequest } from '../../api/companies'
import { getRoomScheduleRequest } from '../../api/rooms'
import { getErrorMessage } from '../../utils/apiErrors'
import { Alert } from '../Alert/Alert'
import { Button } from '../Button/Button'
import { EmptyState } from '../EmptyState/EmptyState'
import { FormField } from '../FormField/FormField'
import { Spinner } from '../Spinner/Spinner'
import './BookingCalendar.css'

const STEP_MINUTES = 30
const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const WEEKDAY_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// El backend numera los días 0=lunes..6=domingo; JS numera 0=domingo..6=sábado.
function toBackendWeekday(date) {
  return (date.getDay() + 6) % 7
}

function timeToMinutes(value) {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

function minutesToDate(baseDate, minutes) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, minutes)
}

function formatTime(date) {
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function buildMonthCells(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = firstOfMonth.getDay()
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7

  const cells = []
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(year, month, i - leading + 1)
    cells.push({ key: formatDateKey(date), date, outside: date.getMonth() !== month })
  }
  return cells
}

export function BookingCalendar({ rooms, user, onCreated }) {
  const queryClient = useQueryClient()
  const today = useMemo(() => startOfDay(new Date()), [])
  const isSuperAdmin = user.role === 'superadmin'
  const hasOwnCompany = Boolean(user.company)
  const canBook = hasOwnCompany || isSuperAdmin

  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [monthDate, setMonthDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(today)
  const [desdeMinutes, setDesdeMinutes] = useState(null)
  const [hastaMinutes, setHastaMinutes] = useState(null)
  const [title, setTitle] = useState('')
  const [error, setError] = useState(null)

  if (!selectedRoomId && rooms.length > 0) {
    setSelectedRoomId(String(rooms[0].id))
  }

  const companiesQuery = useQuery({
    queryKey: ['companies'],
    queryFn: listCompaniesRequest,
    enabled: isSuperAdmin,
  })

  const dateKey = formatDateKey(selectedDate)

  const scheduleQuery = useQuery({
    queryKey: ['room-schedule', selectedRoomId],
    queryFn: () => getRoomScheduleRequest(selectedRoomId),
    enabled: Boolean(selectedRoomId),
  })

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'day', selectedRoomId, dateKey],
    queryFn: () => listBookingsRequest({ room: selectedRoomId, from: dateKey, to: dateKey }),
    enabled: Boolean(selectedRoomId),
  })

  const daySchedule = useMemo(() => {
    if (!scheduleQuery.data) return null
    const weekday = toBackendWeekday(selectedDate)
    return scheduleQuery.data.find((entry) => entry.weekday === weekday) ?? null
  }, [scheduleQuery.data, selectedDate])

  // Horarios disponibles cada media hora dentro del rango habilitado de la sala ese día.
  const timeOptions = useMemo(() => {
    if (!daySchedule) return []
    const startMinutes = timeToMinutes(daySchedule.start_time)
    const endMinutes = timeToMinutes(daySchedule.end_time)
    const now = new Date()
    const opts = []
    for (let m = startMinutes; m <= endMinutes; m += STEP_MINUTES) {
      if (minutesToDate(selectedDate, m) < now) continue
      opts.push(m)
    }
    return opts
  }, [daySchedule, selectedDate])

  const desdeOptions = timeOptions.slice(0, -1)
  const effectiveDesde = desdeOptions.includes(desdeMinutes) ? desdeMinutes : (desdeOptions[0] ?? null)
  const hastaOptions = effectiveDesde != null ? timeOptions.filter((m) => m > effectiveDesde) : []
  const effectiveHasta = hastaOptions.includes(hastaMinutes) ? hastaMinutes : (hastaOptions[0] ?? null)

  const confirmedBookings = useMemo(
    () => (bookingsQuery.data ?? []).filter((b) => b.status === 'confirmed'),
    [bookingsQuery.data]
  )

  const rangeStart = effectiveDesde != null ? minutesToDate(selectedDate, effectiveDesde) : null
  const rangeEnd = effectiveHasta != null ? minutesToDate(selectedDate, effectiveHasta) : null
  const overlapsBooking = Boolean(
    rangeStart && rangeEnd && confirmedBookings.some((b) => new Date(b.start_time) < rangeEnd && new Date(b.end_time) > rangeStart)
  )

  const createBooking = useMutation({
    mutationFn: createBookingRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setDesdeMinutes(null)
      setHastaMinutes(null)
      setTitle('')
      setError(null)
      onCreated?.()
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'No se pudo crear la reserva.'))
    },
  })

  function handleReservar() {
    if (!selectedRoomId || !title.trim() || !rangeStart || !rangeEnd || overlapsBooking) return
    if (isSuperAdmin && !selectedCompanyId) return
    setError(null)
    createBooking.mutate({
      room: Number(selectedRoomId),
      title: title.trim(),
      start_time: rangeStart.toISOString(),
      end_time: rangeEnd.toISOString(),
      company_id: isSuperAdmin ? Number(selectedCompanyId) : undefined,
    })
  }

  const cells = useMemo(() => buildMonthCells(monthDate), [monthDate])
  const monthLabel = `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`
  const weekdayLabel = WEEKDAY_FULL[selectedDate.getDay()]
  const dateLabel = `${selectedDate.getDate()} de ${MONTH_NAMES[selectedDate.getMonth()].toLowerCase()} de ${selectedDate.getFullYear()}`
  const isLoadingSchedule = Boolean(selectedRoomId) && (scheduleQuery.isLoading || bookingsQuery.isLoading)
  const reservarDisabled =
    !canBook ||
    (isSuperAdmin && !selectedCompanyId) ||
    !title.trim() ||
    !rangeStart ||
    !rangeEnd ||
    overlapsBooking ||
    createBooking.isPending

  return (
    <div className="booking-calendar">
      <FormField label="Sala">
        <select
          value={selectedRoomId}
          onChange={(e) => {
            setSelectedRoomId(e.target.value)
            setDesdeMinutes(null)
            setHastaMinutes(null)
            setError(null)
          }}
        >
          <option value="" disabled>
            Elegí una sala
          </option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </FormField>

      {rooms.length === 0 ? (
        <EmptyState title="No hay salas creadas" description="Creá una sala para poder reservar." />
      ) : (
        <div className="booking-calendar-body">
          <div className="booking-calendar-month">
            <div className="booking-calendar-month-header">
              <button
                type="button"
                className="booking-calendar-nav"
                aria-label="Mes anterior"
                onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <span className="booking-calendar-month-label">{monthLabel}</span>
              <button
                type="button"
                className="booking-calendar-nav"
                aria-label="Mes siguiente"
                onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="booking-calendar-weekdays">
              {WEEKDAY_SHORT.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="booking-calendar-days">
              {cells.map((cell) => {
                const isSelected = isSameDay(cell.date, selectedDate)
                const isToday = isSameDay(cell.date, today)
                const disabled = cell.outside || cell.date < today
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={disabled}
                    className={[
                      'booking-calendar-day',
                      isSelected && 'is-selected',
                      cell.outside && 'is-outside',
                      isToday && !isSelected && 'is-today',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      setSelectedDate(cell.date)
                      setDesdeMinutes(null)
                      setHastaMinutes(null)
                      setError(null)
                    }}
                  >
                    {cell.date.getDate()}
                    {isToday && <span className="booking-calendar-day-dot" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="booking-calendar-panel">
            <div className="booking-calendar-panel-header">
              <h3>{weekdayLabel}</h3>
              <p>{dateLabel}</p>
            </div>

            {!canBook && (
              <Alert variant="error">Tu usuario no pertenece a ninguna empresa; no podés crear reservas.</Alert>
            )}

            {isSuperAdmin && (
              <FormField
                label="Empresa"
                hint="Como superadmin, elegí para qué empresa es esta reserva."
              >
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  disabled={companiesQuery.isLoading}
                >
                  <option value="" disabled>
                    {companiesQuery.isLoading ? 'Cargando empresas...' : 'Elegí una empresa'}
                  </option>
                  {companiesQuery.data?.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField
              label="Título de la reserva"
              hint={canBook ? 'Obligatorio para poder reservar el horario elegido.' : undefined}
              error={canBook && desdeOptions.length > 0 && !title.trim() ? 'Ingresá un título para poder reservar.' : undefined}
            >
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Reunión de equipo"
                disabled={!canBook}
              />
            </FormField>

            {!selectedRoomId && <p className="booking-calendar-hint">Elegí una sala para ver el horario disponible.</p>}

            {selectedRoomId && isLoadingSchedule && (
              <p className="booking-calendar-hint">
                <Spinner /> Cargando horario...
              </p>
            )}

            {selectedRoomId && !isLoadingSchedule && !daySchedule && (
              <p className="booking-calendar-hint">La sala no tiene horario habilitado este día.</p>
            )}

            {selectedRoomId && !isLoadingSchedule && daySchedule && desdeOptions.length === 0 && (
              <p className="booking-calendar-hint">No quedan horarios disponibles este día.</p>
            )}

            {selectedRoomId && !isLoadingSchedule && daySchedule && desdeOptions.length > 0 && (
              <>
                {confirmedBookings.length > 0 && (
                  <div className="booking-calendar-busy-list">
                    <span className="booking-calendar-busy-label">Ya reservado:</span>
                    {confirmedBookings.map((b) => (
                      <span key={b.id} className="booking-calendar-busy-chip">
                        {formatTime(new Date(b.start_time))}–{formatTime(new Date(b.end_time))}
                      </span>
                    ))}
                  </div>
                )}

                <div className="booking-calendar-time-row">
                  <FormField label="Desde">
                    <select
                      value={effectiveDesde ?? ''}
                      onChange={(e) => setDesdeMinutes(Number(e.target.value))}
                      disabled={!canBook}
                    >
                      {desdeOptions.map((m) => (
                        <option key={m} value={m}>
                          {formatTime(minutesToDate(selectedDate, m))}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Hasta">
                    <select
                      value={effectiveHasta ?? ''}
                      onChange={(e) => setHastaMinutes(Number(e.target.value))}
                      disabled={!canBook}
                    >
                      {hastaOptions.map((m) => (
                        <option key={m} value={m}>
                          {formatTime(minutesToDate(selectedDate, m))}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                {overlapsBooking && (
                  <p className="field-error">Ese horario se superpone con una reserva existente.</p>
                )}

                <Button loading={createBooking.isPending} disabled={reservarDisabled} onClick={handleReservar}>
                  Reservar
                </Button>
              </>
            )}

            <Alert variant="error">{error}</Alert>
          </div>
        </div>
      )}
    </div>
  )
}
