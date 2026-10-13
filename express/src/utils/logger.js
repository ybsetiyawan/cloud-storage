// utils/logger.js
const pool = require("../db");

const { nanoid } = require("nanoid");
async function logActivity(userId, action, fileId, fileName, ipAddress) {
  try {
    await pool.query(
      `INSERT INTO activities (id, user_id, action, file_id, file_name, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [nanoid(16), userId || null, action, fileId, fileName, ipAddress] // userId akan disimpan sebagai NULL jika tidak ada
    );
  } catch (err) {
    console.error("Log Activity Error:", err);
  }
}

module.exports = { logActivity };