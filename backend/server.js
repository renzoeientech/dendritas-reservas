const express = require('express');
const cors = require('cors');
const path = require('path');

const roomsRouter = require('./routes/rooms');
const reservationsRouter = require('./routes/reservations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api/rooms', roomsRouter);
app.use('/api/reservations', reservationsRouter);

// Servir el frontend (carpeta ../frontend)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});