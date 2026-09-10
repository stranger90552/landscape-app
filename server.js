const express = require('express');
const admin = require('firebase-admin');
const path = require('path');

// 初始化 Firebase Admin (支援本地讀取 JSON 檔案，或雲端讀取環境變數)
if (process.env.FIREBASE_CREDENTIALS_JSON) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://landscape-app-a076d-default-rtdb.firebaseio.com"
  });
} else {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://landscape-app-a076d-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 中介軟體：驗證前端傳來的 Token 是否為合法管理員
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授權：缺少身分憑證' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(403).json({ error: '拒絕存取：無效的管理員身分' });
  }
}

// 安全的寫入 API
app.post('/api/cases', verifyAdmin, async (req, res) => {
  try {
    const casesData = req.body;
    await db.ref('iplants_cases').set(casesData);
    res.json({ success: true, message: '資料已安全儲存至雲端' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`伺服器運行中，連接埠：${PORT}`);
});