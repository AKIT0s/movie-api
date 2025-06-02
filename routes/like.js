// routes/like.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// 영화 좋아요 토글
router.post('/like', async (req, res) => {
  const { member_id, tmdb_id } = req.body;

  if (!member_id || !tmdb_id) {
    return res.status(400).json({ error: 'member_id와 tmdb_id가 필요합니다.' });
  }

  try {
    // tmdb_id로 movie_id 가져오기
    const movieResult = await db.query('SELECT id FROM movie WHERE tmdb_id = $1', [tmdb_id]);

    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: '해당 영화가 존재하지 않습니다.' });
    }

    const movie_id = movieResult.rows[0].id;

    // 좋아요 여부 확인
    const likeCheck = await db.query(
      'SELECT * FROM liked_movie WHERE member_id = $1 AND movie_id = $2',
      [member_id, movie_id]
    );

    if (likeCheck.rows.length > 0) {
      // 이미 좋아요 → 삭제
      await db.query(
        'DELETE FROM liked_movie WHERE member_id = $1 AND movie_id = $2',
        [member_id, movie_id]
      );
      return res.json({ message: '좋아요가 취소되었습니다.', liked: false });
    } else {
      // 좋아요 등록
      await db.query(
        'INSERT INTO liked_movie (member_id, movie_id) VALUES ($1, $2)',
        [member_id, movie_id]
      );
      return res.json({ message: '좋아요가 등록되었습니다.', liked: true });
    }
  } catch (err) {
    console.error('❌ 좋아요 처리 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
