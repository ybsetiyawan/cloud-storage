require("dotenv").config()
const express = require("express")
const cors = require("cors")
const fs = require("fs")
const path = require("path")
const archiver = require("archiver")
const multer = require("multer") // Menggunakan multer yang sudah ada di proyek Anda
const { nanoid } = require("nanoid")
const pool = require("./db") 

// Import Routes
const authRoutes = require("./routes/auth")
const fileRoutes = require("./routes/files")
const folderRoutes = require("./routes/folders")

const app = express()

app.use(cors())
app.use(express.json())

// Konfigurasi Multer untuk penyimpanan sementara public upload
const upload = multer({
  dest: "temp/",
  limits: { fileSize: 100 * 1024 * 1024 }, // Batas 100MB
});

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

    // 2. Jika tidak ada, cari di tabel FOLDERS (Menyertakan allow_upload & allowed_extensions)
    const folderCheck = await pool.query(
      `SELECT id, name, share_id, allow_upload, allowed_extensions, allow_download, 'folder' as type 
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
    🔥 PUBLIC DOWNLOAD FOLDER (ZIP) - REKURSIF
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

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${folder.name}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    async function addFolderToZip(currentFolderId, zipPath) {
      const files = await pool.query(`SELECT * FROM files WHERE folder_id=$1`, [currentFolderId]);
      for (const file of files.rows) {
        const filePath = path.resolve(file.path);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: path.join(zipPath, file.original_name) });
        }
      }

      const subfolders = await pool.query(`SELECT * FROM folders WHERE parent_id=$1`, [currentFolderId]);
      for (const sub of subfolders.rows) {
        await addFolderToZip(sub.id, path.join(zipPath, sub.name));
      }
    }

    await addFolderToZip(folder.id, "");
    await archive.finalize();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).send("Error generating ZIP");
  }
});


/* ==========================================================
   🔥 DOWNLOAD SUBFOLDER BY ID (HANYA ISI FOLDER TERSEBUT)
  ========================================================== */
app.get("/api/public/download-folder/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;

    const folderResult = await pool.query(
      `SELECT * FROM folders WHERE id = $1`,
      [folderId]
    );

    const folder = folderResult.rows[0];
    if (!folder) return res.status(404).send("Folder not found");

    // 🔥 VALIDASI: Cek apakah folder mengizinkan download
    if (folder.allow_download === false) {
      return res.status(403).send("Pengunduhan dinonaktifkan untuk folder ini");
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${folder.name}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    async function addSubFolderToZip(currentFolderId, zipPath) {
      const files = await pool.query(`SELECT * FROM files WHERE folder_id = $1`, [currentFolderId]);
      for (const file of files.rows) {
        const filePath = path.resolve(file.path);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: path.join(zipPath, file.original_name) });
        }
      }

      const subfolders = await pool.query(`SELECT * FROM folders WHERE parent_id = $1`, [currentFolderId]);
      for (const sub of subfolders.rows) {
        await addSubFolderToZip(sub.id, path.join(zipPath, sub.name));
      }
    }

    await addSubFolderToZip(folderId, "");
    await archive.finalize();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).send("Error download folder");
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



app.get("/api/public/download-file/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    const result = await pool.query(
      `
      WITH RECURSIVE folder_tree AS (
        SELECT id, parent_id, is_public, allow_download
        FROM folders
        WHERE id = (SELECT folder_id FROM files WHERE id = $1)

        UNION ALL

        SELECT f.id, f.parent_id, f.is_public, f.allow_download
        FROM folders f
        INNER JOIN folder_tree ft ON ft.parent_id = f.id
      )
      SELECT 
        f.*, 
        EXISTS (
          SELECT 1 FROM folder_tree WHERE is_public = true
        ) as is_allowed,
        (
          SELECT allow_download FROM folder_tree ORDER BY id LIMIT 1
        ) as folder_allow_download
      FROM files f
      WHERE f.id = $1
      `,
      [fileId]
    );

    const file = result.rows[0];
    if (!file) return res.status(404).send("File not found");

    // Cek akses publik folder
    if (!file.is_allowed && !file.is_public) {
      return res.status(403).send("Unauthorized access");
    }

    // 🔥 VALIDASI: Cek apakah folder mengizinkan download (jika kolom false, tolak pengunduhan)
    if (file.folder_allow_download === false) {
      return res.status(403).send("Pengunduhan file dinonaktifkan untuk folder ini");
    }

    const filePath = path.resolve(file.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File missing on disk");
    }

    res.setHeader("Content-Type", file.mime_type);
    res.setHeader("Content-Disposition", `inline; filename="${file.original_name}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});


/* ==========================================================
    🔥 PUBLIC UPLOAD FILE KE FOLDER YANG DI-SHARE (MENGGUNAKAN MULTER)
   ========================================================== */
app.post("/api/public/shared/:token/upload", upload.array("files", 100), async (req, res) => {
  try {
    const { token } = req.params;

    // 1. Cek folder berdasarkan share_id / token dan pastikan publik
    const folderRes = await pool.query(
      "SELECT id, user_id, allow_upload, allowed_extensions FROM folders WHERE share_id = $1 AND is_public = true",
      [token]
    );

    if (folderRes.rowCount === 0) {
      if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      return res.status(404).json({ error: "Folder publik tidak ditemukan" });
    }

    const folder = folderRes.rows[0];

    // 2. Validasi apakah folder mengizinkan upload publik
    if (!folder.allow_upload) {
      if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      return res.status(403).json({ error: "Folder ini tidak mengizinkan unggahan publik" });
    }

    // 3. Validasi keberadaan file
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Tidak ada file yang diunggah" });
    }

    let totalUploadedSize = 0;

    for (const file of req.files) {
      const originalName = file.originalname;
      const fileExtension = originalName.split(".").pop().toLowerCase();

      // 4. Validasi ekstensi file jika dibatasi (allowed_extensions)
      if (folder.allowed_extensions) {
        const allowedList = folder.allowed_extensions
          .split(",")
          .map(ext => ext.trim().toLowerCase());

        if (!allowedList.includes(fileExtension)) {
          // Hapus semua file yang terlanjur di-upload di temp
          req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
          return res.status(400).json({ 
            error: `Ekstensi .${fileExtension} pada file "${originalName}" tidak diizinkan. Ekstensi valid: ${folder.allowed_extensions}` 
          });
        }
      }

      // 5. Tentukan penyimpanan akhir (mengikuti fungsi buildPath atau direktori uploads Anda)
      const fileId = nanoid(16);
      const ext = path.extname(originalName);
      
      const uploadDir = path.join(__dirname, "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const targetPath = path.join(uploadDir, `${fileId}${ext}`);

      // Pindahkan dari temp ke storage
      if (fs.existsSync(file.path)) {
        fs.renameSync(file.path, targetPath);
      }

      const fileSize = file.size;
      const mimeType = file.mimetype || "application/octet-stream";
      const fileShareId = nanoid(10);


      // 6. Simpan data ke tabel files
      await pool.query(
        `INSERT INTO files (id, user_id, folder_id, original_name, stored_name, path, size, mime_type, share_id, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)`,
        [fileId, folder.user_id, folder.id, originalName, `${fileId}${ext}`, targetPath, fileSize, mimeType, fileShareId]
      );

      totalUploadedSize += fileSize;
    }

    // 7. Update total kuota terpakai pemilik folder (users)
    if (totalUploadedSize > 0) {
      await pool.query(
        `UPDATE users SET used_quota = used_quota + $1 WHERE id = $2`,
        [totalUploadedSize, folder.user_id]
      );
    }

    res.json({ success: true, message: `${req.files.length} file berhasil diunggah oleh publik!` });
  } catch (err) {
    console.error("PUBLIC UPLOAD ERROR:", err);
    if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    res.status(500).json({ error: "Gagal mengunggah file publik" });
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