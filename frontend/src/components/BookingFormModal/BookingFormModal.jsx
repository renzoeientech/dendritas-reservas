import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { createBookingRequest } from '../../api/bookings'
import { Alert } from '../Alert/Alert'
import { Button } from '../Button/Button'
import { FormField } from '../FormField/FormField'
import { Modal } from '../Modal/Modal'
import './BookingFormModal.css'

const FIELD_KEYS = ['room', 'title', 'start_time', 'end_time']

function pad(value) {
  return String(value).padStart(2, '0')
}

function toLocalInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function extractErrors(data) {
  const fieldErrors = {}
  const generalMessages = []
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      const message = Array.isArray(value) ? value.join(' ') : String(value)
      if (FIELD_KEYS.includes(key)) {
        fieldErrors[key] = message
      } else {
        generalMessages.push(message)
      }
    }
  }
  return { fieldErrors, generalError: generalMessages.join(' ') || null }
}

function buildForm(prefill) {
  return {
    room: prefill?.room != null ? String(prefill.room) : '',
    title: '',
    start_time: prefill?.start ? toLocalInputValue(prefill.start) : '',
    end_time: prefill?.end ? toLocalInputValue(prefill.end) : '',
  }
}

export function BookingFormModal({ open, onClose, rooms, prefill, onCreated }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => buildForm(prefill))
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const wasOpen = useRef(false)

  // Reinicia el formulario solo en la transición cerrado -> abierto, para no
  // pisar lo que el usuario está tipeando si `prefill` cambia de identidad
  // en re-renders del padre mientras el modal ya está abierto.
  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(buildForm(prefill))
      setFieldErrors({})
      setGeneralError(null)
    }
    wasOpen.current = open
  }, [open, prefill])

  const createBooking = useMutation({
    mutationFn: createBookingRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      onCreated?.()
      onClose()
    },
    onError: (err) => {
      const { fieldErrors: nextFieldErrors, generalError: nextGeneralError } = extractErrors(err.response?.data)
      setFieldErrors(nextFieldErrors)
      setGeneralError(nextGeneralError || 'No se pudo crear la reserva.')
    },
  })

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setGeneralError(null)
    createBooking.mutate({ ...form, room: Number(form.room) })
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva reserva">
      <form onSubmit={handleSubmit}>
        <FormField label="Sala" error={fieldErrors.room}>
          <select value={form.room} onChange={(e) => updateField('room', e.target.value)} required>
            <option value="" disabled>
              Elegí una sala
            </option>
            {rooms
              .filter((room) => room.is_active)
              .map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
          </select>
        </FormField>

        <FormField label="Título" error={fieldErrors.title}>
          <input value={form.title} onChange={(e) => updateField('title', e.target.value)} required />
        </FormField>

        <FormField label="Desde" error={fieldErrors.start_time}>
          <input
            type="datetime-local"
            step="300"
            value={form.start_time}
            onChange={(e) => updateField('start_time', e.target.value)}
            required
          />
        </FormField>

        <FormField label="Hasta" error={fieldErrors.end_time}>
          <input
            type="datetime-local"
            step="300"
            value={form.end_time}
            onChange={(e) => updateField('end_time', e.target.value)}
            required
          />
        </FormField>

        <Alert variant="error">{generalError}</Alert>

        <div className="booking-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={createBooking.isPending}>
            Reservar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
