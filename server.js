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
        // 1. 建立 cases 表格
        db.run(`CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            title TEXT,
            icon TEXT,
            desc TEXT,
            bgImage TEXT
        )`);

        // 2. 建立 plants 表格
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
        )`);

        // 3. 自動植入預設資料（若資料庫無資料時）
        db.get(`SELECT COUNT(*) as count FROM cases`, [], (err, row) => {
            if (err) return;
            if (row.count === 0) {
                console.log('🌱 資料庫為空，開始寫入預設案例與植物數據...');

                // 寫入預設案例 1 & 2
                const stmtCase = db.prepare(`INSERT INTO cases (id, title, icon, desc, bgImage) VALUES (?, ?, ?, ?, ?)`);
                stmtCase.run('case_1', '第一層案例：陽台熱帶植物園', '🏡', '專為半日照陽台設計的植栽佈局，兼具景觀與空氣淨化功能。', 'images/base.jpg');
                stmtCase.run('case_2', '第二層案例：室內觀葉植物角', '🪴', '適合低光照環境的室內綠化範例，運用層次感打造舒適角落。', 'images/base2.jpg');
                stmtCase.finalize();

                // 寫入預設植物
                const stmtPlant = db.prepare(`INSERT INTO plants (id, case_id, name, icon, img, link, desc, care, x, y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                stmtPlant.run('p1', 'case_1', '龜背竹', '🌿', 'images/monstera.jpg', '', '大型觀葉植物，葉片有獨特的羽狀裂紋。', '保持土壤微濕，避免強光直射。', 35, 45);
                stmtPlant.run('p2', 'case_1', '虎尾蘭', '🌱', 'images/snake_plant.jpg', '', '極度耐旱且具備強大空氣淨化能力的植物。', '少澆水，放置於光線明亮處。', 60, 65);
                stmtPlant.run('p3', 'case_2', '琴葉榕', '🌳', 'images/fiddle.jpg', '', '葉片巨大呈提琴狀，極具現代家居風格。', '需要充足散光，注意通風與定期擦拭葉片。', 50, 40);
                stmtPlant.finalize();

                console.log('✅ 預設案例與植物數據自動植入完成！');
            }
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