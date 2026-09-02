import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { deleteCompanyUserRequest, listCompanyUsersRequest } from '../api/companyUsers'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Alert/Alert'
import { Badge } from '../components/Badge/Badge'
import { Button } from '../components/Button/Button'
import { CompanyUserFormModal } from '../components/CompanyUserFormModal/CompanyUserFormModal'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Modal } from '../components/Modal/Modal'
import { getErrorMessage } from '../utils/apiErrors'
import './CompanyUsersPage.css'

const ROLE_LABELS = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  member: 'Miembro',
}

function userDisplay(companyUser) {
  const name = [companyUser.first_name, companyUser.last_name].filter(Boolean).join(' ')
  return name || companyUser.email
}

export function CompanyUsersPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const usersQuery = useQuery({ queryKey: ['company-users'], queryFn: listCompanyUsersRequest })

  const deleteUser = useMutation({
    mutationFn: (userId) => deleteCompanyUserRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] })
      setDeleteTarget(null)
      setDeleteError(null)
    },
    onError: (err) => {
      setDeleteError(getErrorMessage(err, 'No se pudo eliminar el usuario.'))
    },
  })

  function openDeleteModal(companyUser) {
    setDeleteError(null)
    setDeleteTarget(companyUser)
  }

  return (
    <div>
      <div className="company-users-toolbar">
        <h1>Usuarios</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus size={16} aria-hidden="true" />
          Nuevo usuario
        </Button>
      </div>

      {usersQuery.isLoading && <p>Cargando...</p>}
      {usersQuery.isError && <p className="form-error">No se pudieron cargar los usuarios.</p>}

      {usersQuery.data?.length === 0 && (
        <EmptyState title="No hay usuarios en tu empresa" description="Creá el primer usuario." />
      )}

      {usersQuery.data?.length > 0 && (
        <div className="company-users-table-wrap">
          <table className="company-users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data.map((companyUser) => (
                <tr key={companyUser.id}>
                  <td>{[companyUser.first_name, companyUser.last_name].filter(Boolean).join(' ') || '—'}</td>
                  <td>{companyUser.email}</td>
                  <td>{ROLE_LABELS[companyUser.role] ?? companyUser.role}</td>
                  <td>
                    <Badge variant={companyUser.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td>
                    {companyUser.role === 'member' && companyUser.id !== user.id && (
                      <Button variant="danger-outline" size="sm" onClick={() => openDeleteModal(companyUser)}>
                        Eliminar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CompanyUserFormModal open={isFormOpen} onClose={() => setIsFormOpen(false)} />

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Eliminar usuario">
        {deleteTarget && (
          <>
            <p>
              ¿Confirmás eliminar a <strong>{userDisplay(deleteTarget)}</strong>?
            </p>
            <Alert variant="error">{deleteError}</Alert>
            <div className="company-users-form-actions">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Volver
              </Button>
              <Button
                variant="danger"
                loading={deleteUser.isPending}
                onClick={() => deleteUser.mutate(deleteTarget.id)}
              >
                Sí, eliminar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
