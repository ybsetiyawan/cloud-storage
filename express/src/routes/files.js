const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { nanoid } = require("nanoid");

const pool = require("../db");
const auth = require("../middleware/auth");
const { buildPath } = require("../services/storage");
const { logActivity } = require("../utils/logger");

const router = express.Router();

const upload = multer({
  dest: "temp/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// helper normalize path (Windows → URL)
function normalizePath(p) {
  return p.replace(/\\/g, "/");
}


// Helper untuk membuat struktur folder secara rekursif
async function getOrCreateFolderId(fullPath, userId, initialParentId) {
  console.log("Processing path:", fullPath);
  if (!fullPath || !fullPath.includes('/')) return initialParentId;

  const parts = fullPath.split('/').filter(p => p !== "");
  parts.pop(); 

  let currentParentId = initialParentId || null;

  for (const folderName of parts) {
    // Gunakan BEGIN / COMMIT atau lock jika user banyak, 
    // tapi untuk penggunaan standar, SELECT lalu INSERT sudah cukup.
    const check = await pool.query(
      `SELECT id FROM folders 
       WHERE name = $1 AND user_id = $2 AND (parent_id IS NOT DISTINCT FROM $3)`,
      [folderName, userId, currentParentId]
    );

    if (check.rowCount > 0) {
      currentParentId = check.rows[0].id;
    } else {
      const newFolderId = nanoid(16);
      try {
        await pool.query(
          `INSERT INTO folders (id, user_id, name, parent_id) 
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [newFolderId, userId, folderName, currentParentId]
        );
        // Jika ON CONFLICT terjadi, ambil lagi ID yang sudah ada
        const finalCheck = await pool.query(
          `SELECT id FROM folders WHERE name = $1 AND user_id = $2 AND (parent_id IS NOT DISTINCT FROM $3)`,
          [folderName, userId, currentParentId]
        );
        currentParentId = finalCheck.rows[0].id;
      } catch (e) {
        // Handle error lainnya
      }
    }
  }
  console.log("Final Target Folder ID:", currentParentId);
  return currentParentId;
}


// router.post("/upload", auth, upload.array("files", 1000), async (req, res) => {
//   const userId = req.user.id;
//   const initialFolderId = req.body.folder_id || null;
//   const fullPaths = req.body.fullPath; 
//   const clientPath = req.body.path || "root"; // 🔥 Tangkap path dari frontend
//   const results = [];
//   const clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;

//   try {
//     const files = req.files || [];
//     if (!files.length) return res.status(400).json({ error: "no files uploaded" });

//     // 1. AMBIL DATA QUOTA USER TERLEBIH DAHULU
//     const userRes = await pool.query(
//       `SELECT quota, used_quota FROM users WHERE id = $1`,
//       [userId]
//     );
//     const user = userRes.rows[0];
//     let currentQuota = parseInt(user.quota) || 0;
//     let currentUsed = parseInt(user.used_quota) || 0;

//     // Hitung total ukuran seluruh file yang akan di-upload sekaligus
//     const totalIncomingSize = files.reduce((acc, f) => acc + f.size, 0);

//     // 2. CEK APAKAH TOTALNYA MELEBIHI KUOTA (Jika kuota tidak unlimited/0)
//     if (currentQuota > 0 && (currentUsed + totalIncomingSize) > currentQuota) {
//       // Hapus file temp yang kadung ter-upload oleh multer
//       files.forEach(f => {
//         if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
//       });
//       return res.status(400).json({ 
//         error: "Penyimpanan Anda tidak mencukupi untuk mengunggah berkas ini." 
//       });
//     }

//     for (let i = 0; i < files.length; i++) {
//       const file = files[i];
      
//       // Handle jika request datang satu per satu (string) atau sekaligus (array)
//       let currentPath = Array.isArray(fullPaths) ? fullPaths[i] : fullPaths;

//       try {
//         // 1. Dapatkan Folder ID secara rekursif
//         const targetFolderId = await getOrCreateFolderId(currentPath, userId, initialFolderId);

//         // 2. Cek apakah file dengan nama yang sama sudah ada di folder tersebut (case-insensitive)
//         const existingFile = await pool.query(
//           `SELECT id, path, size FROM files 
//            WHERE user_id = $1 AND LOWER(original_name) = LOWER($2) AND (folder_id IS NOT DISTINCT FROM $3)`,
//           [userId, file.originalname, targetFolderId]
//         );

//         const id = nanoid(16);
//         const ext = path.extname(file.originalname);
//         const finalPath = buildPath(userId, id + ext); 

//         if (existingFile.rowCount > 0) {
//           // --- JIKA SUDAH ADA: TIMPA (OVERWRITE) ---
//           const oldFile = existingFile.rows[0];
//           const oldSize = parseInt(oldFile.size) || 0;

//           // Validasi tambahan khusus overwrite jika file penggantinya lebih besar dari sisa kuota
//           if (currentQuota > 0 && (currentUsed - oldSize + file.size) > currentQuota) {
//             if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//             results.push({ name: file.originalname, status: "error: kuota terlampaui" });
//             continue;
//           }

//           // Hapus file fisik lama di storage jika ada
//           if (oldFile.path && fs.existsSync(oldFile.path)) {
//             fs.unlinkSync(oldFile.path);
//           }

//           // Pindahkan file baru dari temp ke storage
//           if (fs.existsSync(file.path)) {
//             fs.renameSync(file.path, finalPath);
//           }

//           // Update data file lama di database
//           await pool.query(
//             `UPDATE files 
//              SET stored_name = $1, path = $2, size = $3, mime_type = $4, created_at = NOW() 
//              WHERE id = $5`,
//             [id + ext, finalPath, file.size, file.mimetype, oldFile.id]
//           );
          

//           // Update kuota user (selisih antara file baru dan file lama)
//           const sizeDiff = file.size - oldSize;
//           if (sizeDiff !== 0) {
//             await pool.query(
//               `UPDATE users SET used_quota = used_quota + $1 WHERE id = $2`,
//               [sizeDiff, userId]
//             );
//             currentUsed += sizeDiff; // Sinkronkan variabel lokal
//           }
//           await logActivity(userId, "OVERWRITE_FILE", oldFile.id, file.originalname, clientPath, clientIp);

//           results.push({ id: oldFile.id, status: "success (overwritten)", name: file.originalname });

//         } else {
//           // --- JIKA BELUM ADA: SIMPAN BARU ---
//           if (fs.existsSync(file.path)) {
//             fs.renameSync(file.path, finalPath);
//           }

//           await pool.query(
//             `INSERT INTO files(id, user_id, folder_id, original_name, stored_name, path, size, mime_type)
//              VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
//             [id, userId, targetFolderId, file.originalname, id + ext, finalPath, file.size, file.mimetype]
//           );

//           await pool.query(
//             `UPDATE users SET used_quota = used_quota + $1 WHERE id = $2`,
//             [file.size, userId]
//           );
//           currentUsed += file.size; // Sinkronkan variabel lokal

//           await logActivity(userId, "UPLOAD_FILE", id, file.originalname, clientPath, clientIp);

//           results.push({ id, status: "success", name: file.originalname });
//         }

//       } catch (fileErr) {
//         console.error("Error file:", file.originalname, fileErr);
//         if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
//         results.push({ name: file.originalname, status: "error" });
//       }
//     }
//     res.json({ results });
//   } catch (err) {
//     console.error("Upload Global Error:", err);
//     res.status(500).json({ error: "Upload failed" });
//   }
// });


router.post("/upload", auth, upload.array("files", 1000), async (req, res) => {
  const userId = req.user.id;
  const initialFolderId = req.body.folder_id || null;
  const fullPaths = req.body.fullPath; 
  const clientPath = req.body.path || "root"; // Path dasar dari frontend (misal: "root" atau "root / Dokumen")
  const results = [];
  const clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;

  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "no files uploaded" });

    // 1. AMBIL DATA QUOTA USER TERLEBIH DAHULU
    const userRes = await pool.query(
      `SELECT quota, used_quota FROM users WHERE id = $1`,
      [userId]
    );
    const user = userRes.rows[0];
    let currentQuota = parseInt(user.quota) || 0;
    let currentUsed = parseInt(user.used_quota) || 0;

    // Hitung total ukuran seluruh file yang akan di-upload sekaligus
    const totalIncomingSize = files.reduce((acc, f) => acc + f.size, 0);

    // 2. CEK APAKAH TOTALNYA MELEBIHI KUOTA (Jika kuota tidak unlimited/0)
    if (currentQuota > 0 && (currentUsed + totalIncomingSize) > currentQuota) {
      files.forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res.status(400).json({ 
        error: "Penyimpanan Anda tidak mencukupi untuk mengunggah berkas ini." 
      });
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Handle jika request datang satu per satu (string) atau sekaligus (array)
      let currentPath = Array.isArray(fullPaths) ? fullPaths[i] : fullPaths;

      try {
        // 🔥 1. Buat path dinamis untuk log aktivitas berdasarkan struktur folder relatif
        let dynamicPath = clientPath;
        if (currentPath && currentPath.includes("/")) {
          const folderNames = currentPath.split("/");
          folderNames.pop(); // Buang nama file di ujung, sisakan susunan foldernya saja
          if (folderNames.length > 0) {
            dynamicPath = `${clientPath} / ${folderNames.join(" / ")}`;
          }
        }

        // 2. Dapatkan Folder ID secara rekursif (otomatis membuat folder jika belum ada)
        const targetFolderId = await getOrCreateFolderId(currentPath, userId, initialFolderId);

        // 3. Cek apakah file dengan nama yang sama sudah ada di folder tersebut (case-insensitive)
        const existingFile = await pool.query(
          `SELECT id, path, size FROM files 
           WHERE user_id = $1 AND LOWER(original_name) = LOWER($2) AND (folder_id IS NOT DISTINCT FROM $3)`,
          [userId, file.originalname, targetFolderId]
        );

        const id = nanoid(16);
        const ext = path.extname(file.originalname);
        const finalPath = buildPath(userId, id + ext); 

        if (existingFile.rowCount > 0) {
          // --- JIKA SUDAH ADA: TIMPA (OVERWRITE) ---
          const oldFile = existingFile.rows[0];
          const oldSize = parseInt(oldFile.size) || 0;

          if (currentQuota > 0 && (currentUsed - oldSize + file.size) > currentQuota) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            results.push({ name: file.originalname, status: "error: kuota terlampaui" });
            continue;
          }

          if (oldFile.path && fs.existsSync(oldFile.path)) {
            fs.unlinkSync(oldFile.path);
          }

          if (fs.existsSync(file.path)) {
            fs.renameSync(file.path, finalPath);
          }

          await pool.query(
            `UPDATE files 
             SET stored_name = $1, path = $2, size = $3, mime_type = $4, created_at = NOW() 
             WHERE id = $5`,
            [id + ext, finalPath, file.size, file.mimetype, oldFile.id]
          );
          
          const sizeDiff = file.size - oldSize;
          if (sizeDiff !== 0) {
            await pool.query(
              `UPDATE users SET used_quota = used_quota + $1 WHERE id = $2`,
              [sizeDiff, userId]
            );
            currentUsed += sizeDiff;
          }

          // 🔥 Catat log aktivitas overwrite dengan path dinamis yang benar
          await logActivity(userId, "OVERWRITE_FILE", oldFile.id, file.originalname, dynamicPath, clientIp);

          results.push({ id: oldFile.id, status: "success (overwritten)", name: file.originalname });

        } else {
          // --- JIKA BELUM ADA: SIMPAN BARU ---
          if (fs.existsSync(file.path)) {
            fs.renameSync(file.path, finalPath);
          }

          await pool.query(
            `INSERT INTO files(id, user_id, folder_id, original_name, stored_name, path, size, mime_type)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, userId, targetFolderId, file.originalname, id + ext, finalPath, file.size, file.mimetype]
          );

          await pool.query(
            `UPDATE users SET used_quota = used_quota + $1 WHERE id = $2`,
            [file.size, userId]
          );
          currentUsed += file.size;

          // 🔥 Catat log aktivitas upload dengan path dinamis yang benar
          await logActivity(userId, "UPLOAD_FILE", id, file.originalname, dynamicPath, clientIp);

          results.push({ id, status: "success", name: file.originalname });
        }

      } catch (fileErr) {
        console.error("Error file:", file.originalname, fileErr);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        results.push({ name: file.originalname, status: "error" });
      }
    }
    res.json({ results });
  } catch (err) {
    console.error("Upload Global Error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});
/* =========================
   LIST FILE
========================= */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const folder_id = req.query.folder_id || null;

    let result;

    if (!folder_id) {
      result = await pool.query(
        `SELECT * FROM files
         WHERE user_id=$1 AND folder_id IS NULL
         ORDER BY created_at DESC`,
        [userId],
      );
    } else {
      result = await pool.query(
        `SELECT * FROM files
         WHERE user_id=$1 AND folder_id=$2
         ORDER BY created_at DESC`,
        [userId, folder_id],
      );
    }

    // normalize path untuk frontend
    const files = result.rows.map((f) => ({
      ...f,
      path: normalizePath(f.path),
    }));

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "failed to get files" });
  }
});

/* =========================
   DOWNLOAD FILE
========================= */
/* =========================
   DOWNLOAD FILE
========================= */
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;
    
    // 🔥 Ambil Alamat IP Klien
    const clientPath = req.query.path ? decodeURIComponent(req.query.path) : "root";
    const clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;

    const result = await pool.query(
      `SELECT * FROM files WHERE id=$1 AND user_id=$2`,
      [fileId, userId],
    );

    const file = result.rows[0];

    if (!file) {
      return res.status(404).json({ error: "file not found" });
    }

    // 🔥 Catat aktivitas DOWNLOAD_FILE ke database
    await logActivity(userId, "DOWNLOAD_FILE", fileId, file.original_name,clientPath, clientIp);

    res.setHeader("Content-Type", file.mime_type);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.original_name}"`,
    );

    fs.createReadStream(file.path).pipe(res);
  } catch (err) {
    console.error("Download Error:", err);
    res.status(500).json({ error: "download failed" });
  }
});

/* =========================
   PREVIEW FILE
========================= */

router.get("/:id/preview", auth, async (req, res) => {
  try {
    const userId = req.user.id
    const fileId = req.params.id

    const result = await pool.query(
      `SELECT * FROM files WHERE id=$1 AND user_id=$2`,
      [fileId, userId]
    )

    

    const file = result.rows[0]

    if (!file) {
      return res.status(404).json({ error: "file not found" })
    }

    const filePath = path.resolve(file.path)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "file missing on disk" })
    }

    // 🔥 INI BEDANYA DENGAN DOWNLOAD
    res.setHeader("Content-Type", file.mime_type)

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.original_name}"`
    )

    fs.createReadStream(filePath).pipe(res)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "preview failed" })
  }
})

/* =========================
   RENAME FILE
========================= */

router.put("/:id/rename", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;
    const { name } = req.body;
    
    // 🔥 Ambil Alamat IP Klien
    const clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    const clientPath = req.body.path || "root"; // 🔥 Tangkap path dari frontend


    if (!name) {
      return res.status(400).json({ error: "name required" });
    }

    const result = await pool.query(
      `UPDATE files 
       SET original_name=$1 
       WHERE id=$2 AND user_id=$3 
       RETURNING *`,
      [name, fileId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "file not found" });
    }

    const updatedFile = result.rows[0];

    // 🔥 Catat aktivitas rename file ke database (menyertakan nama file baru & IP)
    await logActivity(userId, "RENAME_FILE", fileId, updatedFile.original_name, clientPath, clientIp);

    res.json({ success: true });

  } catch (err) {
    console.error("Rename File Error:", err);
    res.status(500).json({ error: "rename failed" });
  }
});


/* =========================
   MOVE FILE
========================= */


router.put("/:id/move", auth, async (req, res) => {
  try {
    const userId = req.user.id
    const fileId = req.params.id
    const { folder_id } = req.body // boleh null (balik ke root)

    // VALIDASI folder tujuan
    if (folder_id) {
      const check = await pool.query(
        `SELECT id FROM folders WHERE id=$1 AND user_id=$2`,
        [folder_id, userId]
      )

      if (check.rowCount === 0) {
        return res.status(400).json({ error: "invalid folder" })
      }
    }

    const result = await pool.query(
      `UPDATE files
       SET folder_id=$1
       WHERE id=$2 AND user_id=$3
       RETURNING *`,
      [folder_id || null, fileId, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "file not found" })
    }

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ error: "move failed" })
  }
})


/* =========================
   DELETE FILE
========================= */
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;
    const clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    const clientPath = req.body.path || "root"; // 🔥 Tangkap path dari frontend
    
    const result = await pool.query(
      `SELECT * FROM files WHERE id=$1 AND user_id=$2`,
      [fileId, userId],
    );

    const file = result.rows[0];

    if (!file) {
      return res.status(404).json({ error: "file not found" });
    }

    const originalFileName = file.original_name; // 🔥 Ambil nama file asli

    // Catat log aktivitas dengan menyertakan nama file sebelum dihapus
    await logActivity(userId, "DELETE_FILE", fileId, originalFileName, clientPath, clientIp);

    // Hapus file fisik di disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Hapus dari database
    await pool.query(`DELETE FROM files WHERE id=$1`, [fileId]);

    // Update kuota
    await pool.query(
      `UPDATE users SET used_quota = used_quota - $1 WHERE id=$2`,
      [file.size, userId],
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Delete File Error:", err);
    res.status(500).json({ error: "delete failed" });
  }
});

// share link
const BASE_URL = process.env.FRONTEND_URL

router.post("/:id/share", auth, async (req, res) => {
  try {
    const userId = req.user.id
    const fileId = req.params.id

    const shareId = nanoid(10)

    const result = await pool.query(
      `UPDATE files 
       SET share_id=$1, is_public=true
       WHERE id=$2 AND user_id=$3
       RETURNING share_id`,
      [shareId, fileId, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "file not found" })
    }

    const link = `${BASE_URL}/s/${shareId}`


    res.json({
      success: true,
      is_public: true,
      link
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "share failed" })
  }
})

module.exports = router;
