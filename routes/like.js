// routes/like.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 좋아요 등록 또는 토글
router.post('/like', async (req, res) => {
  const { member_id, tmdb_id } = req.body;

  if (!member_id || !tmdb_id) {
    return res.status(400).json({ error: 'member_id와 tmdb_id는 필수입니다.' });
  }

  try {
    // 영화 존재 여부 확인
    const movieCheck = await db.query('SELECT id FROM movie WHERE tmdb_id = $1', [tmdb_id]);
    if (movieCheck.rows.length === 0) {
      return res.status(404).json({ error: '해당 tmdb_id의 영화가 없습니다. 먼저 영화를 등록해주세요.' });
    }

    // 이미 좋아요 눌렀는지 확인
    const existing = await db.query(
      'SELECT * FROM likes WHERE member_id = $1 AND tmdb_id = $2',
      [member_id, tmdb_id]
    );

    if (existing.rows.length > 0) {
      // 좋아요 취소 (삭제)
      await db.query('DELETE FROM likes WHERE member_id = $1 AND tmdb_id = $2', [member_id, tmdb_id]);
      return res.status(200).json({ message: '좋아요가 취소되었습니다.', liked: false });
    } else {
      // 좋아요 추가
      await db.query('INSERT INTO likes (member_id, tmdb_id) VALUES ($1, $2)', [member_id, tmdb_id]);
      return res.status(201).json({ message: '좋아요가 등록되었습니다.', liked: true });
    }
  } catch (err) {
    console.error('❌ 좋아요 처리 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 좋아요 삭제 전용 API
router.delete('/like', async (req, res) => {
  const { member_id, tmdb_id } = req.body;

  if (!member_id || !tmdb_id) {
    return res.status(400).json({ error: 'member_id와 tmdb_id는 필수입니다.' });
  }

  try {
    await db.query('DELETE FROM likes WHERE member_id = $1 AND tmdb_id = $2', [member_id, tmdb_id]);
    res.status(200).json({ message: '좋아요가 삭제되었습니다.', liked: false });
  } catch (err) {
    console.error('❌ 좋아요 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;