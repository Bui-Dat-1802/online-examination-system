const fs = require("node:fs/promises");
const path = require("node:path");

async function getImportedMedia(req, res, next) {
  try {
    const relativePath = req.params[0] || "";

    if (!relativePath || relativePath.includes("\0")) {
      return res.status(400).json({ error: "Duong dan anh khong hop le" });
    }

    const mediaRoot = path.resolve(__dirname, "../../uploads/imported-media");
    const filePath = path.resolve(mediaRoot, decodeURIComponent(relativePath));

    if (!filePath.startsWith(`${mediaRoot}${path.sep}`)) {
      return res.status(400).json({ error: "Duong dan anh khong hop le" });
    }

    await fs.access(filePath);
    return res.sendFile(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "Khong tim thay anh" });
    }

    return next(error);
  }
}

module.exports = {
  getImportedMedia,
};
