const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

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

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 管理員 Email 白名單
const ADMIN_EMAILS = [
  'stranger90552@gmail.com',
  'tsaivege@gmail.com'
];

// 驗證權限的中介軟體
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授權：缺少身分憑證' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (!decodedToken.email || !ADMIN_EMAILS.includes(decodedToken.email)) {
      return res.status(403).json({ error: '拒絕存取：此帳號無管理員權限' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(403).json({ error: '拒絕存取：無效的身分憑證' });
  }
}

// 產生 Cloudinary Media Library 安全簽名 API
app.get('/api/cloudinary-signature', verifyAdmin, (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const cloudName = 'kgem7ix6';

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: '伺服器未設定 Cloudinary API Key 或 Secret' });
    }

    // 依據 Cloudinary 規範計算 SHA-1 簽名
    const signature = crypto.createHash('sha1')
      .update(`timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    res.json({
      timestamp: timestamp,
      signature: signature,
      apiKey: apiKey,
      cloudName: cloudName
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 儲存案例 API
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