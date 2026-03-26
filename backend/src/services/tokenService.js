const crypto = require("crypto");
const prisma = require("../prisma");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  // days: lifetime of refresh token (default 30 days)
  async generateRefreshToken(userId, ip = null, days = 30) {
    const token = crypto.randomBytes(64).toString("hex");
    const token_hash = hashToken(token);
    const expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const rec = await prisma.refresh_token.create({
      data: { user_id: userId, token_hash, ip, expires_at },
    });
    return { id: rec.id, token, expires_at };
  },

  // return db record if valid (not revoked and not expired)
  async verifyRefreshToken(token) {
    const token_hash = hashToken(token);
    const rec = await prisma.refresh_token.findFirst({
      where: { token_hash, revoked: false, expires_at: { gt: new Date() } },
    });
    return rec || null;
  },

  async revokeById(id) {
    return prisma.refresh_token.update({
      where: { id },
      data: { revoked: true },
    });
  },

  async revokeByToken(token) {
    const token_hash = hashToken(token);
    return prisma.refresh_token.updateMany({
      where: { token_hash },
      data: { revoked: true },
    });
  },
};