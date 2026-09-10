const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const cors = require('cors');

// 初始化 Firebase Admin
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

// 啟用 CORS 防護
app.use(cors());

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 💡 1. 在陣列中填入兩個（或多個）允許的管理員 Email
const ADMIN_EMAILS = [
  'stranger90552@gmail.com', // 👈 第一位管理員 Email
  'tsaivege@gmail.com'  // 👈 第二位管理員 Email
];

// 💡 2. 安全的中介軟體：檢查發送請求者的 Email 是否在白名單內
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授權：缺少身分憑證' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // 比對 Token 中的 Email 是否屬於 ADMIN_EMAILS 白名單成員
    if (!decodedToken.email || !ADMIN_EMAILS.includes(decodedToken.email)) {
      return res.status(403).json({ error: '拒絕存取：此帳號無管理員寫入權限' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(403).json({ error: '拒絕存取：無效的身分憑證' });
  }
}

// 安全寫入 API
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