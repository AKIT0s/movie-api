// routes/review.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 리뷰 작성 (tmdb_id 기반)
router.post('/reviews', async (req, res) => {
  const {
    member_id,
    tmdb_id,
    content,
    rating,
    emotions,
    media_url,
    highlight_quote,
    highlight_image_url
  } = req.body;

  if (!member_id || !tmdb_id || !content || rating === undefined) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    const movieResult = await db.query(
      'SELECT id FROM movie WHERE tmdb_id = $1',
      [parseInt(tmdb_id)]
    );

    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: '해당 영화가 없습니다. 먼저 영화 등록 후 리뷰 작성하세요.' });
    }

    const movie_id = movieResult.rows[0].id;

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

// 기존: 특정 영화 리뷰 조회 (movie_id 기준)
router.get('/reviews/movie/:movie_id', async (req, res) => {
  const { movie_id } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM review WHERE movie_id = $1 ORDER BY created_at DESC',
      [movie_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('❌ 리뷰 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ✅ 추가: 특정 영화 리뷰 조회 (tmdb_id 기준)
router.get('/reviews/tmdb/:tmdbId', async (req, res) => {
  const { tmdbId } = req.params;

  try {
    const movieResult = await db.query(
      'SELECT id FROM movie WHERE tmdb_id = $1',
      [parseInt(tmdbId)]
    );

    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: '해당 tmdb_id의 영화가 없습니다.' });
    }

    const movieId = movieResult.rows[0].id;

    const reviewResult = await db.query(
      'SELECT * FROM review WHERE movie_id = $1 ORDER BY created_at DESC',
      [movieId]
    );

    res.json(reviewResult.rows);
  } catch (err) {
    console.error('❌ tmdb_id 리뷰 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
