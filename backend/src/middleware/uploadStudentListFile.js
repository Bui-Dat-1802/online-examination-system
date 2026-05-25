const multer = require("multer");
const path = require("path");

const allowedExtensions = [".csv", ".txt", ".xlsx", ".xls", ".docx"];

// Chức năng: kiểm tra định dạng file danh sách sinh viên trước khi upload
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    const err = new Error("Chỉ hỗ trợ file CSV, TXT, Excel hoặc DOCX");
    err.status = 400;
    return cb(err);
  }

  cb(null, true);
}

const uploadStudentListFile = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = uploadStudentListFile;
