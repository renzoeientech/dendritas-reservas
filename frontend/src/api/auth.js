import client from './client'

export async function loginRequest(email, password) {
  const { data } = await client.post('/auth/login/', { email, password })
  return data
}

export async function meRequest() {
  const { data } = await client.get('/auth/me/')
  return data
}
