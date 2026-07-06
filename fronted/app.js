const API_URL = '/api';

const roomSelect = document.getElementById('room-select');
const form = document.getElementById('reservation-form');
const formMessage = document.getElementById('form-message');
const reservationsList = document.getElementById('reservations-list');

// Cargar salas en el <select>
async function loadRooms() {
  const res = await fetch(`${API_URL}/rooms`);
  const rooms = await res.json();

  roomSelect.innerHTML = rooms
    .map(room => `<option value="${room.id}">${room.name} (capacidad: ${room.capacity})</option>`)
    .join('');
}

// Cargar y mostrar reservas
async function loadReservations() {
  const res = await fetch(`${API_URL}/reservations`);
  const reservations = await res.json();

  reservationsList.innerHTML = reservations.map(r => `
    <li>
      <span>
        <strong>${r.room_name}</strong> — ${r.title} (${r.user_name})<br>
        ${formatDate(r.start_time)} a ${formatDate(r.end_time)}
      </span>
      <button class="cancel-btn" data-id="${r.id}">Cancelar</button>
    </li>
  `).join('');

  // Conectar botones de cancelar
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(`${API_URL}/reservations/${btn.dataset.id}`, { method: 'DELETE' });
      loadReservations();
    });
  });
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

// Manejar el envío del formulario
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const body = {
    room_id: roomSelect.value,
    title: document.getElementById('title').value,
    user_name: document.getElementById('user-name').value,
    start_time: document.getElementById('start-time').value,
    end_time: document.getElementById('end-time').value,
  };

  const res = await fetch(`${API_URL}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    formMessage.textContent = data.error;
    formMessage.style.color = 'red';
  } else {
    formMessage.textContent = 'Reserva creada con éxito.';
    formMessage.style.color = 'green';
    form.reset();
    loadReservations();
  }
});

// Cargar todo al iniciar
loadRooms();
loadReservations();