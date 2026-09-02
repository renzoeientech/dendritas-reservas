import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { assignCompanyAdminRequest } from '../../api/companies'
import { getErrorMessage } from '../../utils/apiErrors'
import { Alert } from '../Alert/Alert'
import { Button } from '../Button/Button'
import { FormField } from '../FormField/FormField'
import { Modal } from '../Modal/Modal'
import './CompanyAdminAssignModal.css'

const EMPTY_FORM = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
}

export function CompanyAdminAssignModal({ open, onClose, company, onSaved }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setError(null)
    }
  }, [open])

  const assignAdmin = useMutation({
    mutationFn: (payload) => assignCompanyAdminRequest(company.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      onSaved?.()
      onClose()
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'No se pudo asignar el admin.'))
    },
  })

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    assignAdmin.mutate(form)
  }

  return (
    <Modal open={open} onClose={onClose} title="Asignar admin">
      <form onSubmit={handleSubmit}>
        {company && (
          <p className="company-admin-assign-hint">
            Empresa: <strong>{company.name}</strong>
          </p>
        )}

        <FormField label="Email del admin">
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

        <div className="company-admin-assign-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={assignAdmin.isPending}>
            Asignar admin
          </Button>
        </div>
      </form>
    </Modal>
  )
}
