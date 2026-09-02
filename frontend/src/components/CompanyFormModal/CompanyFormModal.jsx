import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { createCompanyRequest } from '../../api/companies'
import { getErrorMessage } from '../../utils/apiErrors'
import { Alert } from '../Alert/Alert'
import { Button } from '../Button/Button'
import { FormField } from '../FormField/FormField'
import { Modal } from '../Modal/Modal'
import './CompanyFormModal.css'

const EMPTY_FORM = {
  name: '',
  admin_email: '',
  admin_password: '',
  admin_first_name: '',
  admin_last_name: '',
}

export function CompanyFormModal({ open, onClose, onSaved }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setError(null)
    }
  }, [open])

  const saveCompany = useMutation({
    mutationFn: createCompanyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      onSaved?.()
      onClose()
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'No se pudo crear la empresa.'))
    },
  })

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    saveCompany.mutate(form)
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva empresa">
      <form onSubmit={handleSubmit}>
        <FormField label="Nombre de la empresa">
          <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
        </FormField>

        <FormField label="Email del admin" hint="Esta persona podrá crear usuarios dentro de la empresa.">
          <input
            type="email"
            value={form.admin_email}
            onChange={(e) => updateField('admin_email', e.target.value)}
            required
          />
        </FormField>

        <FormField label="Contraseña del admin">
          <input
            type="password"
            value={form.admin_password}
            onChange={(e) => updateField('admin_password', e.target.value)}
            required
          />
        </FormField>

        <FormField label="Nombre">
          <input
            value={form.admin_first_name}
            onChange={(e) => updateField('admin_first_name', e.target.value)}
          />
        </FormField>

        <FormField label="Apellido">
          <input
            value={form.admin_last_name}
            onChange={(e) => updateField('admin_last_name', e.target.value)}
          />
        </FormField>

        <Alert variant="error">{error}</Alert>

        <div className="company-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saveCompany.isPending}>
            Crear empresa
          </Button>
        </div>
      </form>
    </Modal>
  )
}
