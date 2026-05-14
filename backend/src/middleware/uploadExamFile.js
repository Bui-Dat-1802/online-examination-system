const multer = require("multer");
const path = require("path");

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (![".docx", ".pdf"].includes(ext)) {
    return cb(new Error("Chỉ hỗ trợ file DOCX hoặc PDF"));
  }

  cb(null, true);
}

const uploadExamFile = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

module.exports = uploadExamFile;
