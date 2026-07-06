const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/rooms - listar todas las salas
router.get('/', (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms').all();
  res.json(rooms);
});

module.exports = router;