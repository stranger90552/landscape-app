const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'tsai66';

// Middleware 設定
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. 初始化 better-sqlite3 資料庫 (同步連線)
const db = new Database('./landscape.db', { verbose: console.log });

// 初始化資料表
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      title TEXT,
      icon TEXT,
      desc TEXT,
      bgImage TEXT
  );

  CREATE TABLE IF NOT EXISTS plants (
      id TEXT PRIMARY KEY,
      case_id TEXT,
      name TEXT,
      icon TEXT,
      img TEXT,
      link TEXT,
      desc TEXT,
      care TEXT,
      x REAL,
      y REAL
  );
`);

// 自動檢查並補充舊欄位
const alterColumns = ['x REAL', 'y REAL', 'link TEXT', 'care TEXT'];
alterColumns.forEach(col => {
    try {
        db.exec(`ALTER TABLE plants ADD COLUMN ${col}`);
    } catch (e) {
        // 若欄位已存在，忽略錯誤
    }
});

// 2. 管理員驗證 Middleware
function checkAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token === ADMIN_PASSWORD) {
            return next();
        }
    }
    return res.status(401).json({ success: false, message: '未經授權或密碼錯誤' });
}

// ------------------- API 路由 -------------------

// 取得所有案例及植物
app.get('/api/cases', (req, res) => {
    try {
        const cases = db.prepare('SELECT * FROM cases').all();
        const plants = db.prepare('SELECT * FROM plants').all();

        const data = cases.map(c => ({
            ...c,
            plants: plants.filter(p => p.case_id === c.id)
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 新增 / 更新案例
app.post('/api/cases', checkAdmin, (req, res) => {
    const { id, title, icon, desc, bgImage } = req.body;
    const caseId = id || 'case_' + Date.now();

    try {
        const stmt = db.prepare(`
            INSERT INTO cases (id, title, icon, desc, bgImage)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
            title=excluded.title, icon=excluded.icon, desc=excluded.desc, bgImage=excluded.bgImage
        `);
        stmt.run(caseId, title, icon, desc, bgImage);
        res.json({ success: true, id: caseId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 刪除案例
app.delete('/api/cases/:id', checkAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM cases WHERE id = ?').run(req.params.id);
        db.prepare('DELETE FROM plants WHERE case_id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 新增 / 編輯 / 拖曳更新植物
app.post('/api/plants', checkAdmin, (req, res) => {
    const { id, case_id, name, icon, img, link, desc, care, x, y } = req.body;

    if (!case_id || !name) {
        return res.status(400).json({ success: false, message: '缺少必要欄位 (case_id 或 name)' });
    }

    const plantId = id || 'p_' + Date.now();

    try {
        const stmt = db.prepare(`
            INSERT INTO plants (id, case_id, name, icon, img, link, desc, care, x, y)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
            case_id=excluded.case_id, name=excluded.name, icon=excluded.icon,
            img=excluded.img, link=excluded.link, desc=excluded.desc,
            care=excluded.care, x=excluded.x, y=excluded.y
        `);
        stmt.run(plantId, case_id, name, icon, img, link, desc, care, x, y);
        res.json({ success: true, id: plantId });
    } catch (err) {
        console.error('儲存植物失敗:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 刪除植物
app.delete('/api/plants/:id', checkAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM plants WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 預設頁面
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});