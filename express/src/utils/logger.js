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

// 🔥 Tambahkan parameter "path" di sini
async function logActivity(userId, action, fileId, fileName, path, ipAddress) {
  try {
    const sanitizedIp = cleanIp(ipAddress); // Bersihkan format IP
    const sanitizedPath = path || "root"; // Fallback ke 'root' jika path kosong

    await pool.query(
      `INSERT INTO activities (id, user_id, action, file_id, file_name, path, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [nanoid(16), userId || null, action, fileId, fileName, sanitizedPath, sanitizedIp]
    );
  } catch (err) {
    console.error("Log Activity Error:", err);
  }
}


function getClientIp(req) {
  console.log("--- DEBUG IP ---");
  console.log("req.ip:", req.ip);
  console.log("req.socket.remoteAddress:", req.socket.remoteAddress);
  console.log("req.headers['x-forwarded-for']:", req.headers['x-forwarded-for']);
  
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (ip && ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }
  return ip || "-";
}

module.exports = { logActivity, getClientIp };