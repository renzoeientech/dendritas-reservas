import client from './client'

export async function listBookingsRequest({ room, from, to } = {}) {
  const { data } = await client.get('/bookings/', { params: { room, from, to } })
  return data
}

export async function createBookingRequest({ room, title, start_time, end_time }) {
  const { data } = await client.post('/bookings/', { room, title, start_time, end_time })
  return data
}

export async function cancelBookingRequest(bookingId) {
  const { data } = await client.delete(`/bookings/${bookingId}/`)
  return data
}
