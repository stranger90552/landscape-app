const db = require('../config/database');

// 新增/更新植物標記
exports.savePlant = (req, res) => {
  const { id, case_id, name, icon, x, y, img, link, desc, care } = req.body;
  try {
    if (id && id > 0) {
      db.prepare(`UPDATE plants SET name=?, icon=?, x=?, y=?, img=?, link=?, desc=?, care=? WHERE id=?`)
        .run(name, icon, x, y, img, link, desc, care, id);
    } else {
      db.prepare(`INSERT INTO plants (case_id, name, icon, x, y, img, link, desc, care) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(case_id, name, icon || '🌱', x, y, img, link, desc, care);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 刪除植物
exports.deletePlant = (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM plants WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};