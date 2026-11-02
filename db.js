'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'dinner.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    main_id TEXT,
    amends TEXT NOT NULL DEFAULT '[]',
    choices TEXT,
    dessert_id TEXT,
    dessert_amends TEXT NOT NULL DEFAULT '[]',
    allergies TEXT NOT NULL DEFAULT '',
    comments TEXT NOT NULL DEFAULT '',
    opened_at TEXT,
    completed_at TEXT,
    updated_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Cheap forward-migration for databases created before a column existed.
const columns = db
  .prepare("SELECT name FROM pragma_table_info('guests')")
  .all()
  .map((c) => c.name);

for (const [name, ddl] of [
  ['choices', 'ALTER TABLE guests ADD COLUMN choices TEXT'],
  ['amends', "ALTER TABLE guests ADD COLUMN amends TEXT NOT NULL DEFAULT '[]'"],
  ['dessert_id', 'ALTER TABLE guests ADD COLUMN dessert_id TEXT'],
  ['dessert_amends', "ALTER TABLE guests ADD COLUMN dessert_amends TEXT NOT NULL DEFAULT '[]'"],
]) {
  if (!columns.includes(name)) db.exec(ddl);
}

function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, String(value));
}

module.exports = { db, getSetting, setSetting };
