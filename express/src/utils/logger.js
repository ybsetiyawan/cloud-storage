const requestIp = require('request-ip');
const pool = require("../db");
const { nanoid } = require("nanoid");

// Fungsi helper untuk membersihkan format IP v6 mapped
function cleanIp(ip) {
  if (!ip) return "-";
  if (ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }
  return ip;
}

async function logActivity(userId, action, fileId, fileName, path, ipAddress) {
  try {
    const sanitizedIp = cleanIp(ipAddress);
    const sanitizedPath = path || "root";

    await pool.query(
      `INSERT INTO activities (id, user_id, action, file_id, file_name, path, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [nanoid(16), userId || null, action, fileId, fileName, sanitizedPath, sanitizedIp]
    );
  } catch (err) {
    console.error("Log Activity Error:", err);
  }
}

// 🔥 Menggunakan request-ip untuk mendeteksi IP klien secara presisi
function getClientIp(req) {
  const detectedIp = requestIp.getClientIp(req);
  return cleanIp(detectedIp);
}

module.exports = { logActivity, getClientIp };