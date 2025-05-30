// routes/auth.js
const express = require('express');
const router = express.Router();
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

// 회원가입
router.post('/register', async (req, res) => {
  const { id, password, name, birth, gender, email, phone_number } = req.body;

  if (!id || !password || !name || !phone_number) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    const existing = await db.query('SELECT id FROM member WHERE id = $1', [id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '이미 존재하는 ID입니다.' });
    }

    if (email) {
      const existingEmail = await db.query('SELECT email FROM member WHERE email = $1', [email]);
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
      }
    }

    const hashedPw = await argon2.hash(password);

    await db.query(
      `INSERT INTO member (id, password, name, birth, gender, email, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, hashedPw, name, birth || null, gender || null, email || null, phone_number]
    );

    res.status(201).json({ message: '회원가입 성공!' });
  } catch (err) {
    console.error('❌ 등록 실패:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 로그인 (JWT 적용)
router.post('/login', async (req, res) => {
  console.time("🔁 전체 로그인 처리");
  const { id, password } = req.body;

  if (!id || !password) {
    console.timeEnd("🔁 전체 로그인 처리");
    return res.status(400).json({ error: 'ID와 비밀번호를 모두 입력해주세요.' });
  }

  try {
    console.time("📦 DB 쿼리");
    const result = await db.query('SELECT * FROM member WHERE id = $1', [id]);
    console.timeEnd("📦 DB 쿼리");

    const users = result.rows;
    if (users.length === 0) {
      console.timeEnd("🔁 전체 로그인 처리");
      return res.status(401).json({ error: 'ID 또는 비밀번호가 일치하지 않습니다.' });
    }

    const user = users[0];

    console.time("🔐 비밀번호 비교");
    const isMatch = await argon2.verify(user.password, password);
    console.timeEnd("🔐 비밀번호 비교");

    if (!isMatch) {
      console.timeEnd("🔁 전체 로그인 처리");
      return res.status(401).json({ error: 'ID 또는 비밀번호가 일치하지 않습니다.' });
    }

    // ✅ JWT 토큰 발급
    const token = jwt.sign(
      { member_id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.timeEnd("🔁 전체 로그인 처리");
    res.status(200).json({ message: '로그인 성공!', token });
  } catch (err) {
    console.timeEnd("🔁 전체 로그인 처리");
    console.error('❌ 로그인 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;

