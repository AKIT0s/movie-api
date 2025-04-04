console.log('🔥 서버 시작 준비 중...');

// index.js

const express = require('express');
require('dotenv').config();
const app = express();
const db = require('./db'); // DB 테스트용

app.use(express.json());

// 테스트 라우트 유지하고 싶으면 아래 포함!
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT 1 + 1 AS result');
    res.json({ message: 'DB 연결 성공!', result: result.rows[0].result });
  } catch (error) {
    console.error('❌ DB 연결 실패:', error);
    res.status(500).json({ error: 'DB 연결 실패' });
  }
});

// 실제 API 라우터 연결
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// 리뷰 API 라우터 연결
const reviewRoutes = require('./routes/review.js');
app.use('/api', reviewRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
