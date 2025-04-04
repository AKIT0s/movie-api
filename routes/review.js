const express = require('express');
const router = express.Router();
const db = require('../db');

// 리뷰 작성
router.post('/reviews', async (req, res) => {
  const {
    member_id,
    movie_id,
    content,
    rating,
    emotions,
    media_url,
    highlight_quote,
    highlight_image_url
  } = req.body;

  // 필수 값 체크
  if (!member_id || !movie_id || !content || rating === undefined) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO review (
        member_id, movie_id, content, rating, emotions,
        media_url, highlight_quote, highlight_image_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *`,
      [
        member_id,
        movie_id,
        content,
        rating,
        emotions,
        media_url,
        highlight_quote,
        highlight_image_url
      ]
    );

    res.status(201).json({
      message: '리뷰가 등록되었습니다.',
      review: result.rows[0]
    });
  } catch (err) {
    console.error('❌ 리뷰 작성 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
