// routes/movie.js
// routes/movie.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 영화 등록 API - TMDB 등에서 가져온 영화 정보를 DB에 저장
router.post('/movies', async (req, res) => {
  const {
    title,
    genre,
    release_year,
    director,
    poster_url,
    tmdb_id
  } = req.body;

  // 필수값 체크
  if (!title || !release_year) {
    return res.status(400).json({ error: '제목과 개봉 연도는 필수입니다.' });
  }

  try {
    // 1. 중복 확인 (tmdb_id 우선, 없으면 제목+연도로 검사)
    let existing;
    if (tmdb_id) {
      existing = await db.query(`SELECT * FROM movie WHERE tmdb_id = $1`, [tmdb_id]);
    }

    if (!existing || existing.rows.length === 0) {
      existing = await db.query(
        `SELECT * FROM movie WHERE title = $1 AND release_year = $2`,
        [title, release_year]
      );
    }

    if (existing.rows.length > 0) {
      return res.status(200).json({
        message: '이미 등록된 영화입니다.',
        movie: existing.rows[0]
      });
    }

    // 2. 새 영화 등록 (tmdb_id 포함)
    const result = await db.query(
      `INSERT INTO movie (title, genre, release_year, director, poster_url, tmdb_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, genre || [], release_year, director || null, poster_url || null, tmdb_id || null]
    );

    res.status(201).json({
      message: '영화가 등록되었습니다.',
      movie: result.rows[0]
    });
  } catch (err) {
    console.error('❌ 영화 등록 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
