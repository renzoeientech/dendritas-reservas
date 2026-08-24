import client from './client'

export async function listRoomsRequest() {
  const { data } = await client.get('/rooms/')
  return data
}

function buildRoomFormData({ name, capacity, location, color, amenities, photoFile }) {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('capacity', capacity)
  formData.append('location', location)
  formData.append('color', color)
  for (const amenity of amenities ?? []) {
    formData.append('amenities', amenity)
  }
  if (photoFile) {
    formData.append('photo', photoFile)
  }
  return formData
}

export async function createRoomRequest(room) {
  const { data } = await client.post('/rooms/', buildRoomFormData(room))
  return data
}

export async function updateRoomRequest(roomId, room) {
  const { data } = await client.patch(`/rooms/${roomId}/`, buildRoomFormData(room))
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
