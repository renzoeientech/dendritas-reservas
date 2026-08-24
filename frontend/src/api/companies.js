import client from './client'

export async function listCompaniesRequest() {
  const { data } = await client.get('/companies/')
  return data
}
