import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { deleteCompanyAdminRequest, deleteCompanyRequest, listCompaniesRequest } from '../api/companies'
import { Alert } from '../components/Alert/Alert'
import { Button } from '../components/Button/Button'
import { CompanyAdminAssignModal } from '../components/CompanyAdminAssignModal/CompanyAdminAssignModal'
import { CompanyFormModal } from '../components/CompanyFormModal/CompanyFormModal'
import { DropdownMenu } from '../components/DropdownMenu/DropdownMenu'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Modal } from '../components/Modal/Modal'
import { getErrorMessage } from '../utils/apiErrors'
import './CompaniesPage.css'

function formatDate(value) {
  return new Date(value).toLocaleDateString('es-AR', { dateStyle: 'medium' })
}

function adminDisplay(admin) {
  const name = [admin.first_name, admin.last_name].filter(Boolean).join(' ')
  return name ? `${name} (${admin.email})` : admin.email
}

export function CompaniesPage() {
  const queryClient = useQueryClient()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [deleteAdminTarget, setDeleteAdminTarget] = useState(null)
  const [deleteAdminError, setDeleteAdminError] = useState(null)
  const [deleteCompanyTarget, setDeleteCompanyTarget] = useState(null)
  const [deleteCompanyError, setDeleteCompanyError] = useState(null)

  const companiesQuery = useQuery({ queryKey: ['companies'], queryFn: listCompaniesRequest })

  const deleteAdmin = useMutation({
    mutationFn: ({ companyId, adminId }) => deleteCompanyAdminRequest(companyId, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setDeleteAdminTarget(null)
      setDeleteAdminError(null)
    },
    onError: (err) => {
      setDeleteAdminError(getErrorMessage(err, 'No se pudo eliminar el admin.'))
    },
  })

  const deleteCompany = useMutation({
    mutationFn: (companyId) => deleteCompanyRequest(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      setDeleteCompanyTarget(null)
      setDeleteCompanyError(null)
    },
    onError: (err) => {
      setDeleteCompanyError(getErrorMessage(err, 'No se pudo eliminar la empresa.'))
    },
  })

  function openDeleteAdminModal(company, admin) {
    setDeleteAdminError(null)
    setDeleteAdminTarget({ company, admin })
  }

  function openDeleteCompanyModal(company) {
    setDeleteCompanyError(null)
    setDeleteCompanyTarget(company)
  }

  return (
    <div>
      <div className="companies-toolbar">
        <h1>Empresas</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus size={16} aria-hidden="true" />
          Nueva empresa
        </Button>
      </div>

      {companiesQuery.isLoading && <p>Cargando...</p>}
      {companiesQuery.isError && <p className="form-error">No se pudieron cargar las empresas.</p>}

      {companiesQuery.data?.length === 0 && (
        <EmptyState
          title="No hay empresas creadas"
          description="Creá una empresa y designá a su usuario admin."
        />
      )}

      {companiesQuery.data?.length > 0 && (
        <div className="companies-table-wrap">
          <table className="companies-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Admin</th>
                <th>Creada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {companiesQuery.data.map((company) => (
                <tr key={company.id}>
                  <td>{company.name}</td>
                  <td>
                    {company.admins.length === 0 && 'Sin admin asignado'}
                    {company.admins.length > 0 && (
                      <ul className="companies-admin-list">
                        {company.admins.map((admin) => (
                          <li key={admin.id}>
                            <span>{adminDisplay(admin)}</span>
                            <button
                              type="button"
                              className="companies-admin-remove"
                              title="Eliminar admin"
                              aria-label={`Eliminar admin ${admin.email}`}
                              onClick={() => openDeleteAdminModal(company, admin)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>{formatDate(company.created_at)}</td>
                  <td>
                    <DropdownMenu
                      items={[
                        {
                          label: 'Agregar admin',
                          onClick: () => setAssignTarget(company),
                        },
                        {
                          label: 'Eliminar empresa',
                          danger: true,
                          onClick: () => openDeleteCompanyModal(company),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CompanyFormModal open={isFormOpen} onClose={() => setIsFormOpen(false)} />

      <CompanyAdminAssignModal
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        company={assignTarget}
      />

      <Modal open={Boolean(deleteAdminTarget)} onClose={() => setDeleteAdminTarget(null)} title="Eliminar admin">
        {deleteAdminTarget && (
          <>
            <p>
              ¿Confirmás eliminar a <strong>{adminDisplay(deleteAdminTarget.admin)}</strong> como admin de{' '}
              <strong>{deleteAdminTarget.company.name}</strong>?
            </p>
            <Alert variant="error">{deleteAdminError}</Alert>
            <div className="companies-form-actions">
              <Button variant="secondary" onClick={() => setDeleteAdminTarget(null)}>
                Volver
              </Button>
              <Button
                variant="danger"
                loading={deleteAdmin.isPending}
                onClick={() =>
                  deleteAdmin.mutate({
                    companyId: deleteAdminTarget.company.id,
                    adminId: deleteAdminTarget.admin.id,
                  })
                }
              >
                Sí, eliminar
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteCompanyTarget)}
        onClose={() => setDeleteCompanyTarget(null)}
        title="Eliminar empresa"
      >
        {deleteCompanyTarget && (
          <>
            <p>
              ¿Confirmás eliminar <strong>{deleteCompanyTarget.name}</strong>? Se eliminan también todos sus
              usuarios (admin y miembros); nadie de esta empresa va a poder seguir usando el sistema.
            </p>
            <Alert variant="error">{deleteCompanyError}</Alert>
            <div className="companies-form-actions">
              <Button variant="secondary" onClick={() => setDeleteCompanyTarget(null)}>
                Volver
              </Button>
              <Button
                variant="danger"
                loading={deleteCompany.isPending}
                onClick={() => deleteCompany.mutate(deleteCompanyTarget.id)}
              >
                Sí, eliminar empresa
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
