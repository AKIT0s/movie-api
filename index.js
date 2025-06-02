console.log('🔥 서버 시작 준비 중...');

// index.js

const express = require('express');
require('dotenv').config(); // 반드시 최상단

// ✅ 추가: TMDB API KEY 확인 로그
console.log("✅ TMDB API KEY:", process.env.TMDB_API_KEY || "⛔️ Not Set!");

const app = express();
const db = require('./db');

const likeRoutes = require('./routes/like');
app.use('/api', likeRoutes);


app.use(express.json());

app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT 1 + 1 AS result');
    res.json({ message: 'DB 연결 성공!', result: result.rows[0].result });
  } catch (error) {
    console.error('❌ DB 연결 실패:', error);
    res.status(500).json({ error: 'DB 연결 실패' });
  }
});

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const reviewRoutes = require('./routes/review.js');
app.use('/api', reviewRoutes);

const movieRoutes = require('./routes/movie');
app.use('/api', movieRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
