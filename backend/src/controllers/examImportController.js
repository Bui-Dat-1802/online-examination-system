const {
  importExamPreview,
  cleanupImportPreviewMedia,
} = require("../services/examImportService");

async function previewExamImport(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy file upload",
      });
    }

    const result = await importExamPreview(
      req.file.buffer,
      req.file.originalname
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("previewExamImport error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function confirmExamImport(req, res, next) {
  try {
    const teacherId = req.user.id;
    const { questions } = req.body || {};

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        error: "Danh sách câu hỏi không hợp lệ",
      });
    }

    const result = await require("../services/examImportService").confirmExamImport(
      questions,
      teacherId
    );

    return res.status(201).json({
      message: "Thêm câu hỏi thành công",
      totalImported: result.totalImported,
      questions: result.questions,
    });
  } catch (error) {
    // SỬA TẠI ĐÂY: Trả về trực tiếp message của error từ Service
    return res.status(400).json({
      success: false,
      error: error.message || "Thêm câu hỏi thất bại"
    });
  }
}

async function cleanupExamImportMedia(req, res) {
  try {
    const { mediaUrls } = req.body || {};
    const result = await cleanupImportPreviewMedia(mediaUrls);

    return res.json({
      success: true,
      deleted: result.deleted,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || "Khong the don dep anh import",
    });
  }
}

module.exports = {
  previewExamImport,
  confirmExamImport,
  cleanupExamImportMedia,
};
