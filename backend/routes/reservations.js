const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/reservations - listar reservas (opcionalmente filtradas por sala)
router.get('/', (req, res) => {
  const { room_id } = req.query;

  let query = `
    SELECT reservations.*, rooms.name as room_name
    FROM reservations
    JOIN rooms ON reservations.room_id = rooms.id
  `;
  const params = [];

  if (room_id) {
    query += ' WHERE room_id = ?';
    params.push(room_id);
  }

  query += ' ORDER BY start_time ASC';

  const reservations = db.prepare(query).all(...params);
  res.json(reservations);
});

// POST /api/reservations - crear una reserva
router.post('/', (req, res) => {
  const { room_id, title, user_name, start_time, end_time } = req.body;

  if (!room_id || !title || !user_name || !start_time || !end_time) {
    return res.status(400).json({ error: 'Faltan datos obligatorios.' });
  }

  if (new Date(start_time) >= new Date(end_time)) {
    return res.status(400).json({ error: 'La hora de inicio debe ser antes que la de fin.' });
  }

  // Verificar solapamiento de horarios en la misma sala
  const overlap = db.prepare(`
    SELECT * FROM reservations
    WHERE room_id = ?
      AND start_time < ?
      AND end_time > ?
  `).get(room_id, end_time, start_time);

  if (overlap) {
    return res.status(409).json({ error: 'La sala ya está reservada en ese horario.' });
  }

  const insert = db.prepare(`
    INSERT INTO reservations (room_id, title, user_name, start_time, end_time)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = insert.run(room_id, title, user_name, start_time, end_time);

  res.status(201).json({ id: result.lastInsertRowid });
});

// DELETE /api/reservations/:id - cancelar una reserva
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
  res.status(204).send();
});

module.exports = router;