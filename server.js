const express = require('express');
const path = require('path');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 掛載 API 路由
app.use('/api', apiRoutes);

// 所有未匹配路由導回前端 SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🌿 iPlants SDD 系統已成功啟動在 Port ${PORT}`);
});