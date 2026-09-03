// 管理員身分驗證邏輯
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'tsai66';

// 登入驗證 API
exports.login = (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSCODE) {
    res.json({
      success: true,
      message: '認證成功！',
      token: ADMIN_PASSCODE // 簡單傳回通行標記，未來可擴充為 JWT
    });
  } else {
    res.status(401).json({
      success: false,
      message: '密碼錯誤，拒絕存取！'
    });
  }
};