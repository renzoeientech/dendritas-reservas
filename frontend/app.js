const API_URL = '/api';

// Ventana horaria que mostramos en la línea de tiempo de cada sala
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;

const roomsGrid = document.getElementById('rooms-grid');
const roomIdInput = document.getElementById('room-id');
const selectedRoomLabel = document.getElementById('selected-room-label');
const form = document.getElementById('reservation-form');
const formMessage = document.getElementById('form-message');
const reservationsList = document.getElementById('reservations-list');
const emptyState = document.getElementById('empty-state');
const todayLabel = document.getElementById('today-label');
const startInput = document.getElementById('start-time');
const endInput = document.getElementById('end-time');

let rooms = [];
let reservations = [];

init();

async function init() {
  renderTodayLabel();
  setMinDateTimes();
  await Promise.all([loadRooms(), loadReservations()]);
  renderRooms();
  renderReservationsList();
}

function renderTodayLabel() {
  const today = new Date();
  todayLabel.textContent = today.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

function setMinDateTimes() {
  const now = new Date();
  now.setSeconds(0, 0);
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  startInput.min = localIso;
  endInput.min = localIso;
}

async function loadRooms() {
  const res = await fetch(`${API_URL}/rooms`);
  rooms = await res.json();
}

async function loadReservations() {
  const res = await fetch(`${API_URL}/reservations`);
  reservations = await res.json();
}

// ---------- Rooms + timeline ----------

function renderRooms() {
  roomsGrid.innerHTML = rooms.map((room, i) => {
    const todaysReservations = reservationsForRoomToday(room.id);
    return `
      <div class="room-card" tabindex="0" role="button" data-room-id="${room.id}" style="animation-delay:${i * 40}ms">
        <div class="room-card-head">
          <span class="room-name">${escapeHtml(room.name)}</span>
          <span class="room-meta">${room.capacity} pers · ${escapeHtml(room.location || '')}</span>
        </div>
        <div class="timeline">
          ${renderTimelineBlocks(todaysReservations)}
          ${renderNowMarker()}
        </div>
        <div class="timeline-labels">
          <span>${DAY_START_HOUR}:00</span>
          <span>${DAY_END_HOUR}:00</span>
        </div>
      </div>
    `;
  }).join('');

  roomsGrid.querySelectorAll('.room-card').forEach(card => {
    card.addEventListener('click', () => selectRoom(card.dataset.roomId));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectRoom(card.dataset.roomId);
      }
    });
  });
}

function reservationsForRoomToday(roomId) {
  const todayStr = new Date().toDateString();
  return reservations.filter(r =>
    r.room_id === roomId && new Date(r.start_time).toDateString() === todayStr
  );
}

function renderTimelineBlocks(roomReservations) {
  const totalHours = DAY_END_HOUR - DAY_START_HOUR;
  return roomReservations.map(r => {
    const start = new Date(r.start_time);
    const end = new Date(r.end_time);
    const startHour = clamp(start.getHours() + start.getMinutes() / 60, DAY_START_HOUR, DAY_END_HOUR);
    const endHour = clamp(end.getHours() + end.getMinutes() / 60, DAY_START_HOUR, DAY_END_HOUR);
    const left = ((startHour - DAY_START_HOUR) / totalHours) * 100;
    const width = ((endHour - startHour) / totalHours) * 100;
    if (width <= 0) return '';
    return `<div class="timeline-block" style="left:${left}%; width:${width}%" title="${escapeHtml(r.title)} (${escapeHtml(r.user_name)})"></div>`;
  }).join('');
}

function renderNowMarker() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour < DAY_START_HOUR || hour > DAY_END_HOUR) return '';
  const left = ((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR)) * 100;
  return `<div class="timeline-now" style="left:${left}%"></div>`;
}

function selectRoom(roomId) {
  roomIdInput.value = roomId;
  const room = rooms.find(r => String(r.id) === String(roomId));
  selectedRoomLabel.textContent = room ? `Reservando: ${room.name}` : 'Elegí una sala';

  document.querySelectorAll('.room-card').forEach(card => {
    card.classList.toggle('is-selected', card.dataset.roomId === String(roomId));
  });

  document.getElementById('title').focus();
}

// ---------- Reservations list ----------

function renderReservationsList() {
  const upcoming = [...reservations]
    .filter(r => new Date(r.end_time) >= new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  emptyState.hidden = upcoming.length > 0;

  reservationsList.innerHTML = upcoming.map(r => `
    <li class="reservation-item">
      <div class="reservation-info">
        <div class="reservation-room">${escapeHtml(r.room_name)} — ${escapeHtml(r.title)}</div>
        <div class="reservation-time">${formatRange(r.start_time, r.end_time)} · ${escapeHtml(r.user_name)}</div>
      </div>
      <button class="cancel-btn" data-id="${r.id}">Cancelar</button>
    </li>
  `).join('');

  reservationsList.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => cancelReservation(btn.dataset.id));
  });
}

async function cancelReservation(id) {
  await fetch(`${API_URL}/reservations/${id}`, { method: 'DELETE' });
  await loadReservations();
  renderRooms();
  renderReservationsList();
}

// ---------- Form ----------

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!roomIdInput.value) {
    showMessage('Elegí una sala antes de reservar.', 'error');
    return;
  }

  const body = {
    room_id: roomIdInput.value,
    title: document.getElementById('title').value.trim(),
    user_name: document.getElementById('user-name').value.trim(),
    start_time: startInput.value,
    end_time: endInput.value,
  };

  const res = await fetch(`${API_URL}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    showMessage(data.error || 'No se pudo crear la reserva.', 'error');
    return;
  }

  showMessage('Reserva confirmada.', 'success');
  form.reset();
  roomIdInput.value = '';
  selectedRoomLabel.textContent = 'Elegí una sala';
  document.querySelectorAll('.room-card').forEach(c => c.classList.remove('is-selected'));

  await loadReservations();
  renderRooms();
  renderReservationsList();
});

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = type;
}

// ---------- Helpers ----------

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateStr = start.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const startStr = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const endStr = end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr}, ${startStr}–${endStr}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}