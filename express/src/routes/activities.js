const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth"); 

router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const sortOrder = req.query.sort === "asc" ? "ASC" : "DESC";
    
    const startDate = req.query.startDate; 
    const endDate = req.query.endDate;    

    let baseQuery = `
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN files f ON a.file_id = f.id
      WHERE (COALESCE(u.username, 'anonymous') ILIKE $1 OR a.action ILIKE $1 OR f.original_name ILIKE $1 OR a.file_name ILIKE $1)
    `;
    let params = [search];
    let paramIndex = 2;

    if (userRole !== "admin") {
      baseQuery += ` AND a.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (startDate) {
      baseQuery += ` AND a.created_at >= $${paramIndex}::timestamp`;
      params.push(`${startDate} 00:00:00`);
      paramIndex++;
    }

    if (endDate) {
      baseQuery += ` AND a.created_at <= $${paramIndex}::timestamp`;
      params.push(`${endDate} 23:59:59`);
      paramIndex++;
    }

    // 1. Hitung total data
    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    const countResult = await pool.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].count);

    // 2. Ambil data dengan limit & offset
    let dataQuery = `
      SELECT 
        a.id, 
        a.action, 
        a.ip_address,
        a.created_at, 
        COALESCE(u.username, 'anonymous') as username, 
        COALESCE(f.original_name, a.file_name, '-') as file_name
      ${baseQuery}
      ORDER BY a.created_at ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const queryParams = [...params, limit, offset];
    const dataResult = await pool.query(dataQuery, queryParams);

    res.json({
      data: dataResult.rows,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error("Get Activities Error:", err);
    res.status(500).json({ error: "Gagal memuat daftar aktivitas" });
  }
});
module.exports = router;