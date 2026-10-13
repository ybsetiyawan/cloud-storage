const pool = require("../db");
const { nanoid } = require("nanoid");

// Fungsi helper untuk membersihkan format IP v6 mapped
function cleanIp(ip) {
  if (!ip) return "-";
  // Jika berformat ::ffff:10.28.218.219, ambil bagian IPv4-nya saja
  if (ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }
  return ip;
}

async function logActivity(userId, action, fileId, fileName, ipAddress) {
  try {
    const sanitizedIp = cleanIp(ipAddress); // Bersihkan format IP

    await pool.query(
      `INSERT INTO activities (id, user_id, action, file_id, file_name, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [nanoid(16), userId || null, action, fileId, fileName, sanitizedIp]
    );
  } catch (err) {
    console.error("Log Activity Error:", err);
  }
}

module.exports = { logActivity };