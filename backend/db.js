const initSqlJs = require('sql.js');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'gallery.db');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db = null;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    available INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  save();
  seed();
  return db;
}

function save() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function saveSync() { save(); }

function seed() {
  const count = db.exec('SELECT COUNT(*) as c FROM products');
  const productCount = count.length > 0 ? count[0].values[0][0] : 0;
  if (productCount === 0) {
    const seeds = [
      ['Golden Hour', 'A breathtaking oil painting capturing the warm glow of sunset over a tranquil meadow.', 120000, 'golden-hour.svg', 1],
      ['Ocean Serenity', 'Deep blues and turquoise waves crashing against ancient rocks in this acrylic masterpiece.', 95000, 'ocean-serenity.svg', 1],
      ['Urban Dreams', 'A contemporary abstract interpretation of city lights reflecting on rain-soaked streets.', 150000, 'urban-dreams.svg', 1],
      ['Whispers of Spring', 'Delicate watercolor florals dancing in a gentle breeze, evoking renewal and hope.', 78000, 'whispers-spring.svg', 1],
      ['Midnight Sonata', 'An ethereal nocturne painted in deep indigos and silver moonlight on canvas.', 135000, 'midnight-sonata.svg', 1],
      ['Ethereal Garden', 'Layered botanical abstractions that blur the line between reality and imagination.', 110000, 'ethereal-garden.svg', 1],
      ['Desert Mirage', 'Warm terracotta and gold tones telling a story of endless dunes at dawn.', 89000, 'desert-mirage.svg', 1],
      ['Celestial Journey', 'A cosmic-inspired mixed media piece exploring the beauty of nebulae and stars.', 165000, 'celestial-journey.svg', 1],
    ];
    for (const s of seeds) {
      db.run('INSERT INTO products (name, description, price, image, available) VALUES (?, ?, ?, ?, ?)', s);
    }
    console.log('Seed products inserted.');
    save();
  }

  const userCount = db.exec('SELECT COUNT(*) as c FROM users');
  const existingUsers = userCount.length > 0 ? userCount[0].values[0][0] : 0;
  if (existingUsers === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hash]);
    console.log('Default admin user created (admin / admin123)');
    save();
  }
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function get(sql, params = []) {
  const results = all(sql, params);
  return results.length > 0 ? results[0] : null;
}

function run(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid() as id');
  const changes = db.getRowsModified();
  save();
  return {
    lastInsertRowid: lastId.length > 0 ? lastId[0].values[0][0] : null,
    changes,
  };
}

module.exports = { getDb, all, get, run, save };
