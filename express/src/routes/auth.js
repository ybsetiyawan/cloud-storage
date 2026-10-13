const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const pool = require("../db");
const auth = require("../middleware/auth");
const path = require("path"); // 👈 TAMBAHKAN BARIS INI DI BAGIAN ATAS
const fs = require("fs");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    // 🔥 Tangkap role dan quota dari req.body (berikan nilai default jika kosong)
    const { username, password, role = "user", quota = 1073741824 } = req.body;

    if (!username || !password || username.length < 3 || password.length < 5) {
      return res.status(400).json({
        error: "username min 3 char & password min 5 char",
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const id = nanoid(16);

    // 🔥 Masukkan role dan quota ke dalam query INSERT
    await pool.query(
      `INSERT INTO users(id, username, password, role, quota)
       VALUES($1, $2, $3, $4, $5)`,
      [id, username, hashed, role, quota]
    );

    res.json({ success: true });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "username already exists" });
    }

    console.error("Register Error:", err);
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

// ==========================================
// 🛠️ MAINTENANCE / MANAJEMEN USER (ADMIN)
// ==========================================

// 1. GET ALL USERS (Mendapatkan daftar semua user)
router.get("/users", auth, async (req, res) => {
  try {
    // Opsional: Validasi apakah yang mengakses adalah admin (jika ada kolom role)
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Akses ditolak. Khusus admin." });
    }

    const result = await pool.query(
      `SELECT id, username, role, quota, used_quota, created_at FROM users ORDER BY username ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Gagal mengambil data user" });
  }
});

// 2. UPDATE USER (Mengubah kuota atau role user tertentu)
router.put("/users/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Akses ditolak. Khusus admin." });
    }

    const { id } = req.params;
    const { quota, role, password } = req.body;

    // Jika admin ingin mengganti password user
    if (password) {
      if (password.length < 5) {
        return res.status(400).json({ error: "Password minimal 5 karakter" });
      }
      const hashed = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET password = $1 WHERE id = $2`,
        [hashed, id]
      );
    }

    // Update kuota dan role jika disertakan
    if (quota !== undefined || role !== undefined) {
      await pool.query(
        `UPDATE users SET quota = COALESCE($1, quota), role = COALESCE($2, role) WHERE id = $3`,
        [quota, role, id]
      );
    }

    res.json({ success: true, message: "User berhasil diperbarui" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Gagal memperbarui user" });
  }
});

// 3. DELETE USER (Menghapus akun user beserta seluruh file & foldernya secara total)
router.delete("/users/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Akses ditolak. Khusus admin." });
    }

    const { id } = req.params;

    // Cegah admin menghapus akunnya sendiri
    if (id === req.user.id) {
      return res.status(400).json({ error: "Anda tidak dapat menghapus akun Anda sendiri" });
    }

    // 1. Ambil semua path file fisik milik user SEBELUM data di database dihapus
    const filesResult = await pool.query(
      `SELECT path FROM files WHERE user_id = $1`,
      [id]
    );

    const affectedDirs = new Set();

    // 2. Hapus file-file fisik dari harddisk (storage)
    for (const file of filesResult.rows) {
      if (file.path) {
        // Gunakan path.resolve agar path relatif/absolut terbaca dengan pasti
        const absolutePath = path.resolve(file.path);
        
        if (fs.existsSync(absolutePath)) {
          try {
            const dirPath = path.dirname(absolutePath);
            affectedDirs.add(dirPath); // Catat direktori foldernya (misal: .../storage/af)

            fs.unlinkSync(absolutePath);
          } catch (unlinkErr) {
            console.error("Gagal menghapus file fisik:", absolutePath, unlinkErr);
          }
        }
      }
    }

    // 3. Hapus data terkait di database terlebih dahulu
    await pool.query(`DELETE FROM files WHERE user_id = $1`, [id]);
    await pool.query(`DELETE FROM folders WHERE user_id = $1`, [id]);

    const result = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // 4. Bersihkan folder kosong di storage (misal: folder 'af' jika sudah tidak ada file lain)
    for (const dirPath of affectedDirs) {
      if (fs.existsSync(dirPath)) {
        const remainingFiles = fs.readdirSync(dirPath);
        if (remainingFiles.length === 0) {
          fs.rmdirSync(dirPath); // Hapus folder jika sudah benar-benar kosong
        }
      }
    }

    res.json({ success: true, message: "User beserta seluruh file, folder, dan sisa direktori berhasil dibersihkan" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Gagal menghapus user secara total" });
  }
});
module.exports = router;
