import client from './client'

export async function listRoomsRequest() {
  const { data } = await client.get('/rooms/')
  return data
}

export async function createRoomRequest({ name, capacity, location, color }) {
  const { data } = await client.post('/rooms/', { name, capacity, location, color })
  return data
}

export async function getRoomScheduleRequest(roomId) {
  const { data } = await client.get(`/rooms/${roomId}/schedule/`)
  return data
}

export async function putRoomScheduleRequest(roomId, schedules) {
  const { data } = await client.put(`/rooms/${roomId}/schedule/`, schedules)
  return data
}
