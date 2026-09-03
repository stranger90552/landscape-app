const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'tsai66';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 連接 SQLite 資料庫
const db = new sqlite3.Database('./landscape.db', (err) => {
    if (err) {
        console.error('無法連接 SQLite 資料庫:', err.message);
    } else {
        console.log('已成功連接 SQLite 資料庫');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            title TEXT,
            icon TEXT,
            desc TEXT,
            bgImage TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS plants (
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
        )`, () => {
            db.run(`ALTER TABLE plants ADD COLUMN x REAL`, () => {});
            db.run(`ALTER TABLE plants ADD COLUMN y REAL`, () => {});
            db.run(`ALTER TABLE plants ADD COLUMN link TEXT`, () => {});
            db.run(`ALTER TABLE plants ADD COLUMN care TEXT`, () => {});
        });
    });
}

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

// --- API 路由 ---

app.get('/api/cases', (req, res) => {
    db.all(`SELECT * FROM cases`, [], (err, cases) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        db.all(`SELECT * FROM plants`, [], (err, plants) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            const casesWithPlants = cases.map(c => ({
                ...c,
                plants: plants.filter(p => p.case_id === c.id)
            }));

            res.json({ success: true, data: casesWithPlants });
        });
    });
});

app.post('/api/cases', checkAdmin, (req, res) => {
    const { id, title, icon, desc, bgImage } = req.body;
    const caseId = id || 'case_' + Date.now();

    const sql = `INSERT INTO cases (id, title, icon, desc, bgImage) 
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                 title=excluded.title, icon=excluded.icon, desc=excluded.desc, bgImage=excluded.bgImage`;

    db.run(sql, [caseId, title, icon, desc, bgImage], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, id: caseId });
    });
});

app.delete('/api/cases/:id', checkAdmin, (req, res) => {
    db.run(`DELETE FROM cases WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        db.run(`DELETE FROM plants WHERE case_id = ?`, [req.params.id], (err2) => {
            if (err2) return res.status(500).json({ success: false, message: err2.message });
            res.json({ success: true });
        });
    });
});

app.post('/api/plants', checkAdmin, (req, res) => {
    const { id, case_id, name, icon, img, link, desc, care, x, y } = req.body;
    
    if (!case_id || !name) {
        return res.status(400).json({ success: false, message: '缺少必要欄位 (case_id 或 name)' });
    }

    const plantId = id || 'p_' + Date.now();

    const sql = `INSERT INTO plants (id, case_id, name, icon, img, link, desc, care, x, y)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                 case_id=excluded.case_id, name=excluded.name, icon=excluded.icon, 
                 img=excluded.img, link=excluded.link, desc=excluded.desc, 
                 care=excluded.care, x=excluded.x, y=excluded.y`;

    db.run(sql, [plantId, case_id, name, icon, img, link, desc, care, x, y], function(err) {
        if (err) {
            console.error('儲存植物失敗:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ success: true, id: plantId });
    });
});

app.delete('/api/plants/:id', checkAdmin, (req, res) => {
    db.run(`DELETE FROM plants WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});