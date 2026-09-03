const db = require('../config/database');

// 取得所有案例及其關聯植物
exports.getAllCases = (req, res) => {
  try {
    const cases = db.prepare('SELECT * FROM cases ORDER BY createdAt DESC').all();
    const getPlants = db.prepare('SELECT * FROM plants WHERE case_id = ?');

    const result = cases.map(c => ({
      ...c,
      plants: getPlants.all(c.id)
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 新增或更新案例
exports.saveCase = (req, res) => {
  const { id, title, desc, icon, bgImage } = req.body;
  try {
    if (id && db.prepare('SELECT id FROM cases WHERE id = ?').get(id)) {
      db.prepare('UPDATE cases SET title=?, desc=?, icon=?, bgImage=? WHERE id=?')
        .run(title, desc, icon, bgImage, id);
    } else {
      const newId = 'case_' + Date.now();
      db.prepare('INSERT INTO cases (id, title, desc, icon, bgImage) VALUES (?, ?, ?, ?, ?)')
        .run(newId, title, desc, icon || '🏡', bgImage || '');
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 刪除案例
exports.deleteCase = (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM plants WHERE case_id = ?').run(id);
    db.prepare('DELETE FROM cases WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};