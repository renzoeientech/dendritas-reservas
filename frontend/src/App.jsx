import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { BookingsPage } from './pages/BookingsPage'
import { CompaniesPage } from './pages/CompaniesPage'
import { CompanyUsersPage } from './pages/CompanyUsersPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RoomSchedulePage } from './pages/RoomSchedulePage'
import { RoomsPage } from './pages/RoomsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies"
        element={
          <ProtectedRoute roles={['superadmin']}>
            <CompaniesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <CompanyUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms"
        element={
          <ProtectedRoute>
            <RoomsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <BookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms/:roomId/schedule"
        element={
          <ProtectedRoute>
            <RoomSchedulePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
