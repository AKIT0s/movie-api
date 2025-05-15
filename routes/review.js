// routes/review.js

const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../db');

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

  if (!member_id || !title || !content || rating === undefined) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    // 1️⃣ TMDB에서 title로 검색 → 첫 결과의 tmdb_id 추출
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

    // 2️⃣ movie DB에 tmdb_id로 영화 존재 확인
    let movieResult = await db.query(
      'SELECT id FROM movie WHERE tmdb_id = $1',
      [tmdb_id]
    );

    // 3️⃣ 영화 없으면 TMDB 상세 정보 조회 + insert
    if (movieResult.rows.length === 0) {
      const movieResponse = await axios.get(`https://api.themoviedb.org/3/movie/${tmdb_id}`, {
        params: { api_key: TMDB_API_KEY, language: 'ko-KR' }
      });

      const movieData = movieResponse.data;

      const movieTitle = movieData.title;
      const genreNames = movieData.genres ? movieData.genres.map(g => g.name) : [];
      const release_year = movieData.release_date ? parseInt(movieData.release_date.substring(0, 4)) : null;
      const director = null; // TMDB Movie API에서는 감독 정보 없음
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

    // 4️⃣ 리뷰 저장
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
        rating,
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

module.exports = router;
