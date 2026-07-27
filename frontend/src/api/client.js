import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const client = axios.create({ baseURL })

client.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token')
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Tokens are kept in localStorage rather than an httpOnly cookie. This is a
// deliberate simplification, not an oversight: the backend's JWT auth is
// header-based (no cookie/session support), so a cookie-based approach would
// require backend changes out of scope here. The tradeoff: a token in
// localStorage is readable by any JS on the page, so an XSS bug elsewhere in
// the app could exfiltrate it. Worth hardening later if this ever needs it.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    const isAuthEndpoint =
      config?.url?.includes('/auth/login/') || config?.url?.includes('/auth/refresh/')

    if (response?.status === 401 && !isAuthEndpoint && !config._retry) {
      config._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          // Plain axios call (not the wrapped `client`) to avoid re-triggering this interceptor.
          const { data } = await axios.post(`${baseURL}/auth/refresh/`, { refresh: refreshToken })
          localStorage.setItem('access_token', data.access)
          config.headers.Authorization = `Bearer ${data.access}`
          return client(config)
        } catch {
          // fall through to hard logout below
        }
      }
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default client
