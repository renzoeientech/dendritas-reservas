import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert/Alert'
import { Button } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { FormField } from '../components/FormField/FormField'
import './AuthPage.css'

const FIELD_KEYS = ['company_name', 'email', 'password', 'first_name', 'last_name']

export function RegisterPage() {
  const { registerCompany } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    company_name: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setGeneralError(null)
    setSubmitting(true)
    try {
      await registerCompany(form)
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const nextFieldErrors = {}
        let hasGeneral = false
        for (const [key, value] of Object.entries(data)) {
          const message = Array.isArray(value) ? value[0] : String(value)
          if (FIELD_KEYS.includes(key)) {
            nextFieldErrors[key] = message
          } else {
            hasGeneral = true
          }
        }
        setFieldErrors(nextFieldErrors)
        if (hasGeneral || Object.keys(nextFieldErrors).length === 0) {
          setGeneralError('No se pudo completar el registro. Revisá los datos e intentá de nuevo.')
        }
      } else {
        setGeneralError('No se pudo completar el registro. Intentá de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1>Registrar empresa</h1>
        <form onSubmit={handleSubmit}>
          <FormField label="Nombre de la empresa" error={fieldErrors.company_name}>
            <input
              value={form.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              required
            />
          </FormField>

          <FormField label="Email" error={fieldErrors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
            />
          </FormField>

          <FormField label="Contraseña" error={fieldErrors.password}>
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

          <Alert variant="error">{generalError}</Alert>
          <Button type="submit" loading={submitting}>
            Crear cuenta
          </Button>
        </form>
        <p className="auth-switch">
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </p>
      </Card>
    </div>
  )
}
