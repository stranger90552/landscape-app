const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 初始化 SQLite 資料庫
const db = new sqlite3.Database('./database.sqlite');; // 或改為實體檔案路徑如 './database.sqlite'

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    desc TEXT,
    icon TEXT,
    x REAL,
    y REAL
  )`);
});

// 安全驗證 Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // 實際專案中請替換為 jwt.verify(token, SECRET_KEY)
  if (!token) {
    return res.status(0x191).json({ error: '未授權訪問：缺少憑證' });
  }
  next();
}

// 取得所有案例
app.get('/api/cases', (req, res) => {
  db.all('SELECT * FROM cases', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 新增案例（使用預處理語句防範 SQL 注入）
app.post('/api/cases', authenticateToken, (req, res) => {
  const { title, desc, icon, x, y } = req.body;
  const sql = 'INSERT INTO cases (title, desc, icon, x, y) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [title, desc, icon, x, y], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, title, desc, icon, x, y });
  });
});

// 刪除案例
app.delete('/api/cases/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM cases WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '刪除成功', id });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server executing on http://localhost:${PORT}`);
});