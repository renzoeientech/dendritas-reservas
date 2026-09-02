import client from './client'

export async function listCompaniesRequest() {
  const { data } = await client.get('/companies/')
  return data
}

export async function createCompanyRequest(company) {
  const { data } = await client.post('/companies/', company)
  return data
}

export async function deleteCompanyAdminRequest(companyId) {
  const { data } = await client.delete(`/companies/${companyId}/admin/`)
  return data
}

export async function assignCompanyAdminRequest(companyId, admin) {
  const { data } = await client.post(`/companies/${companyId}/admin/`, admin)
  return data
}

export async function deleteCompanyRequest(companyId) {
  const { data } = await client.delete(`/companies/${companyId}/`)
  return data
}
