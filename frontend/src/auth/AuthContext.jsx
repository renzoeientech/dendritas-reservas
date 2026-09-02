import { createContext, useContext, useEffect, useState } from 'react'
import { loginRequest, meRequest } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token')
    if (!accessToken) {
      setIsLoading(false)
      return
    }
    meRequest()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email, password) {
    const { access, refresh } = await loginRequest(email, password)
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    const me = await meRequest()
    setUser(me)
  }

  function logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
