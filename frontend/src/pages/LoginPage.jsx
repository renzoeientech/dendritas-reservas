import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert/Alert'
import { Button } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { FormField } from '../components/FormField/FormField'
import './AuthPage.css'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      if (!err.response) {
        setError('No se pudo conectar con el servidor. Verificá que esté corriendo.')
      } else {
        setError('Email o contraseña incorrectos.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1>Iniciar sesión</h1>
        <form onSubmit={handleSubmit}>
          <FormField label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField label="Contraseña">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormField>
          <Alert variant="error">{error}</Alert>
          <Button type="submit" loading={submitting}>
            Ingresar
          </Button>
        </form>
        <p className="auth-switch">
          ¿No tenés cuenta? <Link to="/register">Registrá tu empresa</Link>
        </p>
      </Card>
    </div>
  )
}
