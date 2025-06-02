// routes/review.js

const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// 리뷰 작성 (title 기반 → TMDB 검색 → 영화 자동 저장 + 리뷰 저장)
router.post('/reviews', async (req, res) => {
  const {
    member_id,
    title,
    content,
    rating,
    emotions,
    media_url,
    highlight_quote,
    highlight_image_url
  } = req.body;

  const parsedRating = parseFloat(rating);

  if (!member_id?.trim() || !title?.trim() || !content?.trim() || isNaN(parsedRating)) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    const searchResponse = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        query: title,
        language: 'ko-KR'
      }
    });

    if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
      return res.status(404).json({ error: 'TMDB에서 해당 제목의 영화를 찾을 수 없습니다.' });
    }

    const tmdb_id = searchResponse.data.results[0].id;

    let movieResult = await db.query(
      'SELECT id FROM movie WHERE tmdb_id = $1',
      [tmdb_id]
    );

    if (movieResult.rows.length === 0) {
      const movieResponse = await axios.get(`https://api.themoviedb.org/3/movie/${tmdb_id}`, {
        params: { api_key: TMDB_API_KEY, language: 'ko-KR' }
      });

      const movieData = movieResponse.data;

      const movieTitle = movieData.title;
      const genreNames = movieData.genres ? movieData.genres.map(g => g.name) : [];
      const release_year = movieData.release_date ? parseInt(movieData.release_date.substring(0, 4)) : null;
      const director = null;
      const poster_url = movieData.poster_path
        ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}`
        : null;

      const insertResult = await db.query(
        `INSERT INTO movie (title, genre, release_year, director, poster_url, tmdb_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [movieTitle, genreNames, release_year, director, poster_url, tmdb_id]
      );

      movieResult = { rows: [{ id: insertResult.rows[0].id }] };
    }

    const movie_id = movieResult.rows[0].id;

    const reviewResult = await db.query(
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
        parsedRating,
        emotions,
        media_url,
        highlight_quote,
        highlight_image_url
      ]
    );

    res.status(201).json({
      message: '리뷰가 등록되었습니다.',
      review: reviewResult.rows[0]
    });

  } catch (err) {
    console.error('❌ 리뷰 작성 오류 (title 기반 자동 등록 포함):', err.response?.data || err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 특정 영화의 리뷰 조회 (tmdb_id 기준)
router.get('/reviews/tmdb/:tmdb_id', async (req, res) => {
  const { tmdb_id } = req.params;

  try {
    const movieResult = await db.query(
      'SELECT id FROM movie WHERE tmdb_id = $1',
      [tmdb_id]
    );

    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: '해당 영화가 없습니다.' });
    }

    const movie_id = movieResult.rows[0].id;

    const reviewResult = await db.query(
      'SELECT * FROM review WHERE movie_id = $1 ORDER BY created_at DESC',
      [movie_id]
    );

    res.status(200).json(reviewResult.rows);
  } catch (err) {
    console.error('❌ 리뷰 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 별점 조회 API
router.get('/reviews/tmdb/:tmdb_id/rating', async (req, res) => {
  const { tmdb_id } = req.params;

  try {
    const movieResult = await db.query(
      'SELECT id FROM movie WHERE tmdb_id = $1',
      [tmdb_id]
    );

    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: '해당 영화가 없습니다.' });
    }

    const movie_id = movieResult.rows[0].id;

    const avgResult = await db.query(
      'SELECT COUNT(*) AS total_reviews, ROUND(AVG(rating)::numeric, 1) AS average_rating FROM review WHERE movie_id = $1',
      [movie_id]
    );

    const distResult = await db.query(
      'SELECT FLOOR(rating) AS rating_group, COUNT(*) AS count FROM review WHERE movie_id = $1 GROUP BY rating_group',
      [movie_id]
    );

    const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    distResult.rows.forEach(row => {
      const key = Math.min(Math.max(parseInt(row.rating_group), 1), 5);
      distribution[key] = parseInt(row.count);
    });

    res.json({
      tmdb_id: parseInt(tmdb_id),
      average_rating: parseFloat(avgResult.rows[0].average_rating) || 0,
      total_reviews: parseInt(avgResult.rows[0].total_reviews),
      rating_distribution: distribution
    });
  } catch (err) {
    console.error('❌ 별점 조회 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 리뷰 수정 API (PATCH)
router.patch('/reviews/:id', async (req, res) => {
  const { id } = req.params;
  const { member_id, content, rating, emotions, media_url, highlight_quote, highlight_image_url } = req.body;

  if (!member_id || !content || rating === undefined) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    const existing = await db.query('SELECT * FROM review WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '리뷰를 찾을 수 없습니다.' });
    }
    if (existing.rows[0].member_id !== member_id) {
      return res.status(403).json({ error: '리뷰를 수정할 권한이 없습니다.' });
    }

    const updated = await db.query(
      `UPDATE review
       SET content = $1, rating = $2, emotions = $3, media_url = $4,
           highlight_quote = $5, highlight_image_url = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [content, rating, emotions, media_url, highlight_quote, highlight_image_url, id]
    );

    res.status(200).json({ message: '리뷰가 수정되었습니다.', review: updated.rows[0] });
  } catch (err) {
    console.error('❌ 리뷰 수정 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 🔐 리뷰 삭제 API - JWT 기반 인증 필요
router.delete('/reviews/:id', authenticateToken, async (req, res) => {
  const reviewId = req.params.id;
  const memberId = req.user.member_id; // JWT에서 추출된 사용자 ID

  try {
    // 1. 해당 리뷰가 존재하고, 현재 사용자 것이 맞는지 확인
    const result = await db.query(
      'SELECT * FROM review WHERE id = $1 AND member_id = $2',
      [reviewId, memberId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '해당 리뷰가 없거나 삭제 권한이 없습니다.' });
    }

    // 2. 삭제 진행
    await db.query('DELETE FROM review WHERE id = $1', [reviewId]);

    res.status(200).json({ message: '리뷰가 삭제되었습니다.' });
  } catch (err) {
    console.error('❌ 리뷰 삭제 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;

