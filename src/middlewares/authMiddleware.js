// 驗證管理員密碼 (可透過環境變數或預設)
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'tsai66';

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const password = authHeader ? authHeader.replace('Bearer ', '') : req.body.password;

  if (password === ADMIN_PASSCODE) {
    next();
  } else {
    res.status(401).json({ success: false, message: '權限不足或密碼錯誤！' });
  }
}

module.exports = { requireAdmin };