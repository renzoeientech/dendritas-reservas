const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data.db'));

// Crear tabla de salas si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    location TEXT
  )
`);

// Crear tabla de reservas si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    user_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  )
`);

// Sembrar salas de ejemplo si la tabla está vacía
const count = db.prepare('SELECT COUNT(*) as total FROM rooms').get().total;
if (count === 0) {
  const insert = db.prepare('INSERT INTO rooms (name, capacity, location) VALUES (?, ?, ?)');
  insert.run('Sala Norte', 4, 'Piso 1');
  insert.run('Sala Sur', 8, 'Piso 1');
  insert.run('Sala de Directorio', 12, 'Piso 2');
}

module.exports = db;