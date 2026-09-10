const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 設定安全 CORS 白名單
const allowedOrigins = [
  'https://landscape-app-hz3q.onrender.com', // 👈 請將此處替換為您在 Render 的實際網址
  'http://localhost:3000',               // 保留本機測試使用
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // 允許同源請求、無 origin 的請求 (例如同網域伺服器內部呼叫、手機等)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true); // 網域在白名單內，允許存取
    } else {
      callback(new Error('CORS 策略不允許來自此來源的存取。'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.static('public')); // 提供 static 靜態檔案

// 2. 初始化 Firebase Admin SDK
if (process.env.FIREBASE_CREDENTIALS_JSON) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://landscape-app-a076d-default-rtdb.firebaseio.com"
  });
} else {
  // 本機開發備用
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://landscape-app-a076d-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

// 管理員 Email 白名單
const ADMIN_EMAILS = [
  'stranger90552@gmail.com',
  'tsaivege@gmail.com'
];

// 中間件：驗證 Firebase 管理員 Auth Token
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供授權 Token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (ADMIN_EMAILS.includes(decodedToken.email)) {
      req.user = decodedToken;
      next();
    } else {
      res.status(403).json({ error: '權限不足：非管理員帳號' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Token 驗證失敗', details: error.message });
  }
}

// 3. API：產生 Cloudinary Media Library 認證簽名 (方案 B)
app.get('/api/cloudinary-signature', verifyAdmin, (req, res) => {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = 'kgem7ix6';

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: '伺服器未設定 Cloudinary API Key 或 Secret' });
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // 按照字母順序對簽名參數排序
  const paramsToSign = `timestamp=${timestamp}`;

  // 使用 SHA-256 HMAC 演算法生成安全簽名
  const signature = crypto
    .createHash('sha256')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  res.json({
    signature,
    timestamp,
    apiKey,
    cloudName
  });
});

// 4. API：儲存案例資料到 Firebase Realtime Database
app.post('/api/cases', verifyAdmin, async (req, res) => {
  try {
    const casesData = req.body;
    const ref = db.ref('landscape_cases');
    await ref.set(casesData);
    res.json({ message: '資料更新成功！' });
  } catch (error) {
    res.status(500).json({ error: '資料寫入失敗', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});