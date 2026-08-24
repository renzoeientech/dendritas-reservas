import client from './client'

export async function registerCompanyRequest({
  company_name,
  email,
  password,
  first_name,
  last_name,
}) {
  const { data } = await client.post('/auth/register-company/', {
    company_name,
    email,
    password,
    first_name,
    last_name,
  })
  return data
}

export async function loginRequest(email, password) {
  const { data } = await client.post('/auth/login/', { email, password })
  return data
}

export async function meRequest() {
  const { data } = await client.get('/auth/me/')
  return data
}
