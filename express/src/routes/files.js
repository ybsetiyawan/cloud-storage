const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { nanoid } = require("nanoid");

const pool = require("../db");
const auth = require("../middleware/auth");
const { buildPath } = require("../services/storage");

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
/* =========================
   UPLOAD MULTI FILE
========================= */
router.post("/upload", auth, upload.array("files", 1000), async (req, res) => {
  const userId = req.user.id;
  const initialFolderId = req.body.folder_id || null;
  const fullPaths = req.body.fullPath; 
  const results = [];

  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "no files uploaded" });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Handle jika request datang satu per satu (string) atau sekaligus (array)
      let currentPath = Array.isArray(fullPaths) ? fullPaths[i] : fullPaths;

      try {
        // 1. Dapatkan Folder ID secara rekursif
        const targetFolderId = await getOrCreateFolderId(currentPath, userId, initialFolderId);

        // 2. Persiapan simpan file (Variabel yang tadi hilang)
        const id = nanoid(16);
        const ext = path.extname(file.originalname);
        const finalPath = buildPath(userId, id + ext); 

        // 3. Pindahkan dari temp ke storage asli
        if (fs.existsSync(file.path)) {
          fs.renameSync(file.path, finalPath);
        }

        // 4. Simpan ke Database
        await pool.query(
          `INSERT INTO files(id, user_id, folder_id, original_name, stored_name, path, size, mime_type)
           VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, userId, targetFolderId, file.originalname, id + ext, finalPath, file.size, file.mimetype]
        );

        // 5. Update Quota
        await pool.query(
          `UPDATE users SET used_quota = used_quota + $1 WHERE id = $2`,
          [file.size, userId]
        );

        results.push({ id, status: "success", name: file.originalname });
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
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;

    const result = await pool.query(
      `SELECT * FROM files WHERE id=$1 AND user_id=$2`,
      [fileId, userId],
    );

    const file = result.rows[0];

    if (!file) {
      return res.status(404).json({ error: "file not found" });
    }

    res.setHeader("Content-Type", file.mime_type);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.original_name}"`,
    );

    fs.createReadStream(file.path).pipe(res);
  } catch (err) {
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
    const userId = req.user.id
    const fileId = req.params.id
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ error: "name required" })
    }

    const result = await pool.query(
      `UPDATE files 
       SET original_name=$1 
       WHERE id=$2 AND user_id=$3 
       RETURNING *`,
      [name, fileId, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "file not found" })
    }

    res.json({ success: true })

  } catch (err) {
    res.status(500).json({ error: "rename failed" })
  }
})


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

    const result = await pool.query(
      `SELECT * FROM files WHERE id=$1 AND user_id=$2`,
      [fileId, userId],
    );

    const file = result.rows[0];

    if (!file) {
      return res.status(404).json({ error: "file not found" });
    }

    // HAPUS FILE DISK
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // HAPUS DB
    await pool.query(`DELETE FROM files WHERE id=$1`, [fileId]);

    // UPDATE QUOTA
    await pool.query(
      `UPDATE users SET used_quota = used_quota - $1 WHERE id=$2`,
      [file.size, userId],
    );

    res.json({ success: true });
  } catch (err) {
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
