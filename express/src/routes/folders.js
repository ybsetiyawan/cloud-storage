const express = require("express");
const { nanoid } = require("nanoid");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();
const archiver = require('archiver');

// CREATE FOLDER
router.post("/", auth, async (req, res) => {
  try {
    const { name, parent_id } = req.body;
    const userId = req.user.id;
    console.log("BODY:", req.body);

    if (!name) {
      return res.status(400).json({ error: "name required" });
    }

    const id = nanoid(16);

    await pool.query(
      `INSERT INTO folders(id, user_id, name, parent_id)
       VALUES($1,$2,$3,$4)`,
      [id, userId, name, parent_id || null],
    );

    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "create folder failed" });
  }
});

// LIST FOLDER
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const parent_id = req.query.parent_id || null;

    const result = await pool.query(
      `SELECT * FROM folders
       WHERE user_id=$1 AND 
             (parent_id IS NOT DISTINCT FROM $2)
       ORDER BY name ASC`,
      [userId, parent_id],
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "failed to get folders" });
  }
});

// RENAME FOLDER

router.put("/:id/rename", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name required" });
    }

    const result = await pool.query(
      `UPDATE folders 
       SET name=$1 
       WHERE id=$2 AND user_id=$3
       RETURNING *`,
      [name, folderId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "folder not found" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "rename folder failed" });
  }
});

// MOVE FOLDER

router.put("/:id/move", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;
    const { parent_id } = req.body;

    // ❗ tidak boleh pindah ke dirinya sendiri
    if (folderId === parent_id) {
      return res.status(400).json({ error: "invalid move" });
    }

    // VALIDASI parent folder
    if (parent_id) {
      const check = await pool.query(
        `SELECT id FROM folders WHERE id=$1 AND user_id=$2`,
        [parent_id, userId],
      );

      if (check.rowCount === 0) {
        return res.status(400).json({ error: "invalid parent" });
      }
    }

    const result = await pool.query(
      `UPDATE folders
       SET parent_id=$1
       WHERE id=$2 AND user_id=$3
       RETURNING *`,
      [parent_id || null, folderId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "folder not found" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "move folder failed" });
  }
});

router.get("/tree", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const parent_id = req.query.parent_id || null;

    const folders = await pool.query(
      `SELECT id, name, created_at, 'folder' as type
       FROM folders
       WHERE user_id=$1 AND (parent_id IS NOT DISTINCT FROM $2)`,
      [userId, parent_id],
    );

    const files = await pool.query(
      `SELECT id, original_name as name, size, created_at, 'file' as type
       FROM files
       WHERE user_id=$1 AND (folder_id IS NOT DISTINCT FROM $2)`,
      [userId, parent_id],
    );

    res.json([...folders.rows, ...files.rows]);
  } catch (err) {
    res.status(500).json({ error: "failed to get tree" });
  }
});

// router.post("/:id/share", auth, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const folderId = req.params.id;
//     const shareId = nanoid(10);

//     const result = await pool.query(
//       `UPDATE folders 
//        SET share_id=$1, is_public=true
//        WHERE id=$2 AND user_id=$3
//        RETURNING share_id`,
//       [shareId, folderId, userId],
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: "folder not found" });
//     }

//     res.json({
//       success: true,
//       link: `http://localhost:8090/sf/${shareId}`,
//     });
//   } catch (err) {
//     res.status(500).json({ error: "share folder failed" });
//   }
// });

const BASE_URL = process.env.FRONTEND_URL
router.post("/:id/share", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;
    const newShareId = nanoid(10); // ID cadangan jika belum ada

    const result = await pool.query(
      `UPDATE folders 
       SET share_id = COALESCE(share_id, $1), is_public = true
       WHERE id = $2 AND user_id = $3
       RETURNING share_id`,
      [newShareId, folderId, userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "folder not found" });
    }

    const shareId = result.rows[0].share_id;

    res.json({
      success: true,
      share_id: shareId,
      // Arahkan semua ke /s/ agar ditangani oleh pages/s/[id].vue di Nuxt
      // link: `http://localhost:3000/s/${shareId}`, 
      is_public: true,
      link: `${BASE_URL}/s/${shareId}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "share folder failed" });
  }
});

const fs = require("fs");
const path = require("path");

async function deleteFolder(folderId, userId) {
  // 1. Hapus semua file di folder
  const filesResult = await pool.query(
    `SELECT * FROM files WHERE folder_id=$1 AND user_id=$2`,
    [folderId, userId]
  );

  for (const file of filesResult.rows) {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }

  await pool.query(`DELETE FROM files WHERE folder_id=$1 AND user_id=$2`, [folderId, userId]);

  // 2. Hapus semua subfolder (rekursif)
  const subfolders = await pool.query(
    `SELECT id FROM folders WHERE parent_id=$1 AND user_id=$2`,
    [folderId, userId]
  );

  for (const sub of subfolders.rows) {
    await deleteFolder(sub.id, userId); // rekursif
  }

  // 3. Hapus folder sendiri
  await pool.query(`DELETE FROM folders WHERE id=$1 AND user_id=$2`, [folderId, userId]);
}

// router.delete("/:id", auth, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const folderId = req.params.id;

//     const folderExists = await pool.query(`SELECT id FROM folders WHERE id=$1 AND user_id=$2`, [folderId, userId]);
//     if(folderExists.rows.length === 0) return res.status(404).json({ error: "Folder not found" });

//     await deleteFolder(folderId, userId);

//     res.json({ success: true });
//   } catch(err) {
//     console.error(err);
//     res.status(500).json({ error: "Delete failed" });
//   }
// });


router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;

    const folderExists = await pool.query(
      `SELECT id FROM folders WHERE id=$1 AND user_id=$2`,
      [folderId, userId]
    );

    if (folderExists.rows.length === 0) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // ✅ 1. HITUNG TOTAL SIZE DALAM FOLDER (RECURSIVE)
    const totalSizeResult = await pool.query(`
      WITH RECURSIVE subfolders AS (
        SELECT id FROM folders WHERE id = $1
        UNION ALL
        SELECT f.id FROM folders f
        INNER JOIN subfolders sf ON f.parent_id = sf.id
      )
      SELECT COALESCE(SUM(size), 0) as total
      FROM files
      WHERE folder_id IN (SELECT id FROM subfolders)
    `, [folderId]);

    const totalSize = parseInt(totalSizeResult.rows[0].total) || 0;

    // ✅ 2. DELETE FOLDER
    await deleteFolder(folderId, userId);

    // ✅ 3. UPDATE QUOTA
    await pool.query(
      `UPDATE users SET used_quota = used_quota - $1 WHERE id=$2`,
      [totalSize, userId]
    );

    res.json({ success: true });

  } catch(err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

router.get("/:id/download", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const folderId = req.params.id;

    // 1. Ambil info folder utama
    const folderRes = await pool.query(
      `SELECT name FROM folders WHERE id=$1 AND user_id=$2`,
      [folderId, userId]
    );
    if (folderRes.rowCount === 0) return res.status(404).json({ error: "Folder not found" });
    
    const folderName = folderRes.rows[0].name;

    // 2. Set header agar browser mengenali ini sebagai file ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folderName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    // 3. Fungsi Rekursif untuk memasukkan file ke ZIP
    async function addFolderToZip(currentFolderId, zipPath) {
      // Ambil semua file di folder ini
      const files = await pool.query(
        `SELECT path, original_name FROM files WHERE folder_id=$1 AND user_id=$2`,
        [currentFolderId, userId]
      );
      for (const file of files.rows) {
        if (fs.existsSync(file.path)) {
          archive.file(file.path, { name: path.join(zipPath, file.original_name) });
        }
      }

      // Ambil semua subfolder
      const subfolders = await pool.query(
        `SELECT id, name FROM folders WHERE parent_id=$1 AND user_id=$2`,
        [currentFolderId, userId]
      );
      for (const sub of subfolders.rows) {
        await addFolderToZip(sub.id, path.join(zipPath, sub.name));
      }
    }

    // Mulai proses pengarsipan
    await addFolderToZip(folderId, "");
    
    archive.finalize();

  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Download folder failed" });
  }
});

module.exports = router;
