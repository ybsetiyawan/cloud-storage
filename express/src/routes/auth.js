const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || username.length < 3 || password.length < 5) {
      return res.status(400).json({
        error: "username min 3 char & password min 5 char",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const id = nanoid(16);

    await pool.query(
      `INSERT INTO users(id, username, password)
       VALUES($1,$2,$3)`,
      [id, username, hashed],
    );

    res.json({ success: true });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "username already exists" });
    }

    res.status(500).json({ error: "server error" });
  }
});

// LOGIN
// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Cek apakah username dan password diisi
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi" });
    }

    const result = await pool.query(
      "SELECT id, username, password, role, quota, used_quota FROM users WHERE username=$1",
      [username],
    );

    const user = result.rows[0];

    // 1. Tangani jika user tidak ditemukan di database
    if (!user) {
      return res.status(404).json({ error: "Akun atau username tidak terdaftar" });
    }

    // 2. Tangani jika password salah
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ error: "Password yang Anda masukkan salah" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        quota: user.quota,
        used_quota: user.used_quota
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});



router.get("/me", auth, async (req, res) => {

  if (!req.user) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const result = await pool.query(
    `SELECT id, username, role, quota, used_quota 
     FROM users WHERE id=$1`,
    [req.user.id]
  )

  res.json(result.rows[0])
})

module.exports = router;
