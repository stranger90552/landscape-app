const express = require('express');
const path = require('path');
const apiRoutes = require('./src/routes/api');

const app = express();
// 1. Render 會提供 PORT 環境變數，必須優先使用
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '10mb' }));

// 2. 設定靜態檔案資料夾
app.use(express.static(path.join(__dirname, 'public')));

// 3. API 路由 (必須在萬用路由 '*' 之前)
app.use('/api', apiRoutes);

// 4. 前端 SPA 路由
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// 5. 綁定 0.0.0.0 以利 Render 監聽
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌿 Server running on port ${PORT}`);
});