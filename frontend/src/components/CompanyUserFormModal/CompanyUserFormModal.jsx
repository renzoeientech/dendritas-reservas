import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { createCompanyUserRequest } from '../../api/companyUsers'
import { getErrorMessage } from '../../utils/apiErrors'
import { Alert } from '../Alert/Alert'
import { Button } from '../Button/Button'
import { FormField } from '../FormField/FormField'
import { Modal } from '../Modal/Modal'
import './CompanyUserFormModal.css'

const EMPTY_FORM = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
}

export function CompanyUserFormModal({ open, onClose, onSaved }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setError(null)
    }
  }, [open])

  const saveUser = useMutation({
    mutationFn: createCompanyUserRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] })
      onSaved?.()
      onClose()
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'No se pudo crear el usuario.'))
    },
  })

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    saveUser.mutate(form)
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo usuario">
      <form onSubmit={handleSubmit}>
        <FormField label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />
        </FormField>

        <FormField label="Contraseña">
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            required
          />
        </FormField>

        <FormField label="Nombre">
          <input value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
        </FormField>

        <FormField label="Apellido">
          <input value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
        </FormField>

        <Alert variant="error">{error}</Alert>

        <div className="company-user-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saveUser.isPending}>
            Crear usuario
          </Button>
        </div>
      </form>
    </Modal>
  )
}
