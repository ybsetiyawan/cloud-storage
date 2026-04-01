require("dotenv").config()
const express = require("express")
const cors = require("cors")
const fs = require("fs")
const path = require("path")
const archiver = require("archiver")
const pool = require("./db") 

// Import Routes
const authRoutes = require("./routes/auth")
const fileRoutes = require("./routes/files")
const folderRoutes = require("./routes/folders")

const app = express()

app.use(cors())
app.use(express.json())

/* =========================
    ROUTES API (PRIVATE)
   ========================= */
app.use("/api/auth", authRoutes)
app.use("/api/files", fileRoutes)
app.use("/api/folders", folderRoutes)


/* ==========================================================
    API UNTUK PREVIEW (DI PANGGIL OLEH NUXT /s/[id])
    Mengambil metadata file/folder berdasarkan share_id
   ========================================================== */
app.get("/api/public/share-info/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;

    // 1. Cari di tabel FILES dulu
    const fileCheck = await pool.query(
      `SELECT id, original_name as name, size, mime_type, share_id, 'file' as type 
       FROM files WHERE share_id = $1 AND is_public = true`,
      [shareId]
    );

    if (fileCheck.rowCount > 0) {
      return res.json(fileCheck.rows[0]);
    }

    // 2. Jika tidak ada, cari di tabel FOLDERS
    const folderCheck = await pool.query(
      `SELECT id, name, share_id, 'folder' as type 
       FROM folders WHERE share_id = $1 AND is_public = true`,
      [shareId]
    );

    if (folderCheck.rowCount > 0) {
      const folder = folderCheck.rows[0];

      // Ambil isi di dalam folder tersebut (sub-item)
      const subFolders = await pool.query(
        `SELECT id, name, share_id, 'folder' as type FROM folders WHERE parent_id = $1`,
        [folder.id]
      );
      const subFiles = await pool.query(
        `SELECT id, original_name as name, size, mime_type, share_id, 'file' as type FROM files WHERE folder_id = $1`,
        [folder.id]
      );

      return res.json({
        ...folder,
        children: [...subFolders.rows, ...subFiles.rows]
      });
    }

    res.status(404).json({ error: "Link share tidak ditemukan" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


/* ==========================================================
    🔥 PUBLIC DOWNLOAD FILE (VIA SHARE_ID)
    Digunakan untuk file tunggal yang di-share
   ========================================================== */
app.get("/s/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;
    const result = await pool.query(
      `SELECT * FROM files WHERE share_id=$1 AND is_public=true`,
      [shareId]
    );

    const file = result.rows[0];
    if (!file) return res.status(404).send("File not found");

    const filePath = path.resolve(file.path);
    if (!fs.existsSync(filePath)) return res.status(404).send("Physical file missing");

    res.setHeader("Content-Type", file.mime_type);
    res.setHeader("Content-Disposition", `attachment; filename="${file.original_name}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


/* ==========================================================
    🔥 PUBLIC DOWNLOAD FOLDER (ZIP)
    Mengompres folder yang di-share menjadi ZIP
   ========================================================== */
app.get("/sf/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;
    const folderResult = await pool.query(
      `SELECT * FROM folders WHERE share_id=$1 AND is_public=true`,
      [shareId]
    );

    const folder = folderResult.rows[0];
    if (!folder) return res.status(404).send("Folder not found");

    const files = await pool.query(`SELECT * FROM files WHERE folder_id=$1`, [folder.id]);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${folder.name}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    files.rows.forEach(file => {
      const filePath = path.resolve(file.path);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file.original_name });
      }
    });

    await archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating ZIP");
  }
});

app.get("/api/public/folder-content/:id", async (req, res) => {
  try {
    const folderId = req.params.id;

    const folders = await pool.query(
      `SELECT id, name, share_id, 'folder' as type
       FROM folders
       WHERE parent_id = $1
       ORDER BY name ASC`,
      [folderId]
    );

    const files = await pool.query(
      `SELECT id, original_name as name, size, share_id, 'file' as type
       FROM files
       WHERE folder_id = $1
       ORDER BY original_name ASC`,
      [folderId]
    );

    res.json([...folders.rows, ...files.rows]);
  } catch (err) {
    console.error("ERROR FOLDER CONTENT:", err);
    res.status(500).json({ error: "failed get folder content" });
  }
});


/* ==========================================================
   🔥 DOWNLOAD FOLDER BY ID (UNTUK SUBFOLDER TANPA SHARE_ID)
   ========================================================== */
app.get("/api/public/download-folder/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;

    // ambil folder
    const folderResult = await pool.query(
      `SELECT * FROM folders WHERE id = $1`,
      [folderId]
    );

    const folder = folderResult.rows[0];
    if (!folder) return res.status(404).send("Folder not found");

    // ambil semua file dalam folder (RECURSIVE kalau mau advanced)
    const files = await pool.query(
      `SELECT * FROM files WHERE folder_id = $1`,
      [folderId]
    );

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${folder.name}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (const file of files.rows) {
      const filePath = path.resolve(file.path);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file.original_name });
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error download folder");
  }
});


/* ==========================================================
    🔥 NEW: DOWNLOAD INDIVIDUAL FILE INSIDE PUBLIC FOLDER
    Mendownload file di dalam list folder share (menggunakan ID asli)
   ========================================================== */
app.get("/api/public/download-file/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    // 🔥 ambil file + parent chain
    const result = await pool.query(
      `
      WITH RECURSIVE folder_tree AS (
        SELECT id, parent_id, is_public
        FROM folders
        WHERE id = (SELECT folder_id FROM files WHERE id = $1)

        UNION ALL

        SELECT f.id, f.parent_id, f.is_public
        FROM folders f
        INNER JOIN folder_tree ft ON ft.parent_id = f.id
      )
      SELECT 
        f.*, 
        EXISTS (
          SELECT 1 FROM folder_tree WHERE is_public = true
        ) as is_allowed
      FROM files f
      WHERE f.id = $1
      `,
      [fileId]
    );

    const file = result.rows[0];
    if (!file) return res.status(404).send("File not found");

    // 🔥 cek akses
    if (!file.is_allowed && !file.is_public) {
      return res.status(403).send("Unauthorized access to this file");
    }

    const filePath = path.resolve(file.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File missing on server");
    }

    res.setHeader("Content-Type", file.mime_type);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.original_name}"`
    );

    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

/* =========================
    START SERVER
   ========================= */
const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`🚀 Server Indomarco EDP running on port ${PORT}`);
  console.log(`🔗 Public link: http://localhost:${PORT}/s/:shareId`);
});