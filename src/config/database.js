const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../landscape.db'));

// 初始化資料表：案例表 (cases) 與 植物標記表 (plants)
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    desc TEXT,
    icon TEXT DEFAULT '🏡',
    bgImage TEXT DEFAULT 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1200',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '🌱',
    x REAL NOT NULL,
    y REAL NOT NULL,
    img TEXT,
    link TEXT,
    desc TEXT,
    care TEXT,
    FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE
  );
`);

module.exports = db;