import client from './client'

export async function listCompanyUsersRequest() {
  const { data } = await client.get('/auth/company-users/')
  return data
}

export async function createCompanyUserRequest(user) {
  const { data } = await client.post('/auth/company-users/', user)
  return data
}

export async function deleteCompanyUserRequest(userId) {
  const { data } = await client.delete(`/auth/company-users/${userId}/`)
  return data
}
