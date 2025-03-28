// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

router.post('/register', async (req, res) => {
  const { id, password, name, birth, gender, email, phone_number } = req.body;

  if (!id || !password || !name || !phone_number) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  try {
    // 중복 ID 확인
    const existing = await db.query('SELECT id FROM member WHERE id = $1', [id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '이미 존재하는 ID입니다.' });
    }

    // 중복 이메일 확인
    if (email) {
      const existingEmail = await db.query('SELECT email FROM member WHERE email = $1', [email]);
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
      }
    }

    const hashedPw = await bcrypt.hash(password, 10);

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


// 로그인
router.post('/login', async (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ error: 'ID와 비밀번호를 모두 입력해주세요.' });
  }

  try {
    // 1. 해당 ID로 유저 조회
    const result = await db.query('SELECT * FROM member WHERE id = $1', [id]);
    const users = result.rows;

    if (users.length === 0) {
      return res.status(401).json({ error: 'ID 또는 비밀번호가 일치하지 않습니다.' });
    }

    const user = users[0];

    // 2. 비밀번호 비교
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'ID 또는 비밀번호가 일치하지 않습니다.' });
    }

    // 3. 로그인 성공
    res.status(200).json({ message: '로그인 성공!' });
  } catch (err) {
    console.error('❌ 로그인 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
