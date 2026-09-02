import { LogOut, Menu, Waypoints, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button/Button'
import './AppShell.css'

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/rooms', label: 'Salas' },
  { to: '/bookings', label: 'Reservas' },
]

const ROLE_NAV_ITEMS = {
  superadmin: [{ to: '/companies', label: 'Empresas' }],
  admin: [{ to: '/users', label: 'Usuarios' }],
}

function NavLinks({ role, onNavigate }) {
  const items = [...NAV_ITEMS, ...(ROLE_NAV_ITEMS[role] ?? [])]
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `app-shell-link${isActive ? ' app-shell-link-active' : ''}`}
          onClick={onNavigate}
        >
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

export function AppShell({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <div className="app-shell-header-inner">
          <span className="app-shell-brand">
            <Waypoints size={20} className="app-shell-brand-icon" aria-hidden="true" />
            Agendritas
          </span>

          <nav className="app-shell-nav" aria-label="Principal">
            <NavLinks role={user.role} />
          </nav>

          <div className="app-shell-user">
            <span className="app-shell-user-name">{user.first_name || user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              Salir
            </Button>
          </div>

          <button
            type="button"
            className="app-shell-menu-toggle"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="app-shell-mobile-nav"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="app-shell-mobile-nav" className="app-shell-nav-mobile" aria-label="Principal (mobile)">
            <NavLinks role={user.role} onNavigate={() => setMenuOpen(false)} />
            <div className="app-shell-user">
              <span className="app-shell-user-name">{user.first_name || user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut size={16} aria-hidden="true" />
                Salir
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main className="app-shell-main">{children}</main>
    </div>
  )
}
