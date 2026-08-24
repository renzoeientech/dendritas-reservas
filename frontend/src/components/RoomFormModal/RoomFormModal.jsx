import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Coffee, Presentation, Projector, Snowflake, Tv, Wifi } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createRoomRequest, updateRoomRequest } from '../../api/rooms'
import { getErrorMessage } from '../../utils/apiErrors'
import { Alert } from '../Alert/Alert'
import { Button } from '../Button/Button'
import { FormField } from '../FormField/FormField'
import { Modal } from '../Modal/Modal'
import './RoomFormModal.css'

const AMENITY_OPTIONS = [
  { value: 'tv', label: 'TV', icon: Tv },
  { value: 'pizarra', label: 'Pizarra', icon: Presentation },
  { value: 'proyector', label: 'Proyector', icon: Projector },
  { value: 'wifi', label: 'Wifi', icon: Wifi },
  { value: 'aire_acondicionado', label: 'Aire acondicionado', icon: Snowflake },
  { value: 'cafetera', label: 'Cafetera', icon: Coffee },
]

function buildForm(room) {
  return {
    name: room?.name ?? '',
    capacity: room?.capacity != null ? String(room.capacity) : '',
    location: room?.location ?? '',
    color: room?.color ?? '#1e90ff',
    amenities: room?.amenities ?? [],
  }
}

export function RoomFormModal({ open, onClose, room, onSaved }) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(room)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(() => buildForm(room))
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(room?.photo ?? null)
  const [error, setError] = useState(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(buildForm(room))
      setPhotoFile(null)
      setPhotoPreview(room?.photo ?? null)
      setError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    wasOpen.current = open
  }, [open, room])

  const saveRoom = useMutation({
    mutationFn: (payload) => (isEdit ? updateRoomRequest(room.id, payload) : createRoomRequest(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      onSaved?.()
      onClose()
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'No se pudo guardar la sala.'))
    },
  })

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleAmenity(value) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(value)
        ? prev.amenities.filter((a) => a !== value)
        : [...prev.amenities, value],
    }))
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] ?? null
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : (room?.photo ?? null))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    saveRoom.mutate({ ...form, capacity: Number(form.capacity), photoFile })
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar sala' : 'Nueva sala'}>
      <form onSubmit={handleSubmit}>
        <FormField label="Nombre">
          <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
        </FormField>
        <FormField label="Capacidad" hint="Cantidad de personas que entran en la sala.">
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

        <FormField label="Equipamiento">
          <div className="room-amenities-grid">
            {AMENITY_OPTIONS.map(({ value, label, icon: Icon }) => {
              const checked = form.amenities.includes(value)
              return (
                <label key={value} className={`room-amenity-option${checked ? ' is-checked' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleAmenity(value)} />
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </label>
              )
            })}
          </div>
        </FormField>

        <FormField label="Foto">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} />
        </FormField>
        {photoPreview && (
          <img src={photoPreview} alt="Vista previa de la sala" className="room-photo-preview" />
        )}

        <Alert variant="error">{error}</Alert>

        <div className="room-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saveRoom.isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear sala'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
