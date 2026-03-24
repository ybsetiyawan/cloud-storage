const jwt = require("jsonwebtoken")

function auth(req, res, next) {

  const header = req.headers.authorization

  // ❗ jika tidak ada header
  if (!header) {
    return res.status(401).json({ error: "unauthorized" })
  }

  // biasanya format: Bearer token
  const token = header.startsWith("Bearer ")
    ? header.split(" ")[1]
    : header

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded

    next()

  } catch (err) {
    return res.status(401).json({ error: "invalid token" })
  }
}

module.exports = auth