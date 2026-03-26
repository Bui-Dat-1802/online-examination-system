const jwt = require("jsonwebtoken");
const userService = require("../services/userService");
const JWT_SECRET = process.env.JWT_SECRET || "Password123!!!";

module.exports = async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Không có quyền truy cập" });
    }
    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await userService.getUserById(payload.id);
    if (!user) return res.status(401).json({ error: "Không có quyền truy cập" });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};