const teacherController = require("../controllers/teacherController");
const {
  previewExamImport,
  confirmExamImport,
} = require("../controllers/examImportController");

const uploadExamFile = require("../middleware/uploadExamFile");

const express = require("express");
const router = express.Router();

router.post("/classes", teacherController.createClass); // Tạo lớp học mới
router.get("/classes", teacherController.getClassesByTeacher); // Lấy danh sách lớp học của giáo viên
router.get("/classes/:id", teacherController.getClassById); // Lấy thông tin lớp học theo ID
router.put("/classes/:id", teacherController.updateClass); // Cập nhật thông tin lớp học

router.delete("/classes/:id", teacherController.deleteClass); // Xóa lớp học
router.delete("/classes/:classId/students/:studentId", teacherController.removeStudentFromClass); // Xóa học sinh khỏi lớp học


router.get("/classes/:id/enrollment-requests", teacherController.getEnrollmentRequests); // Lấy danh sách yêu cầu tham gia lớp học
router.post("/enrollment-requests/approve", teacherController.approveEnrollmentRequest); // Phê duyệt hoặc từ chối yêu cầu tham gia lớp học



router.post("/questions", teacherController.addQuestion); // Tạo câu hỏi 
router.get("/questions", teacherController.getQuestionsbyTeacher); // Lấy danh sách câu hỏi theo id giáo viên
router.put("/questions/:id", teacherController.updateQuestion); // Cập nhật câu hỏi
router.delete("/questions/:id", teacherController.deleteQuestion); // Xóa câu hỏi (soft delete)
router.put("/questions/:id/restore", teacherController.restoreQuestion); // Khôi phục câu hỏi
router.get("/questions/:id", teacherController.getQuestionById); // Lấy thông tin câu hỏi theo ID

router.post("/exam-templates", teacherController.createExamTemplate); // Tạo mẫu đề thi
router.get("/exam-templates", teacherController.getExamTemplatesByTeacher); // Lấy danh sách mẫu đề thi của giáo viên
router.put("/exam-templates/:id", teacherController.updateExamTemplate); // Cập nhật mẫu đề thi
router.delete("/exam-templates/:id", teacherController.deleteExamTemplate); // Xóa mẫu đề thi (soft delete)
router.put("/exam-templates/:id/restore", teacherController.restoreExamTemplate); // Khôi phục mẫu đề thi
router.get("/exam-templates/search", teacherController.searchExamTemplates); // Tìm kiếm mẫu đề thi theo từ khóa
router.get("/exam-templates/:id", teacherController.getExamTemplateById); // Lấy thông tin mẫu đề thi theo ID

router.post("/exam-instances", teacherController.createExamInstance); // Tạo instance đề thi
router.delete("/exam-instances/:id", teacherController.deleteExamInstance); // Xóa instance đề thi (soft delete)
router.put("/exam-instances/:id/restore", teacherController.restoreExamInstance); // Khôi phục instance đề thi
router.get("/exam-templates/:templateId/exam-instances", teacherController.getExamInstancesByTemplate); // Lấy danh sách instance đề thi theo template  
router.put("/exam-instances/:id", teacherController.updateExamInstance); // Cập nhật instance đề thi
router.get("/exam-instances/:id", teacherController.getExamInstanceById); // Lấy thông tin instance đề thi theo ID
router.get("/classes/:classId/students",teacherController.searchStudentsInClass); // Tìm kiếm sinh viên trong lớp học theo tên
router.post("/exam-instances/:id/publish", teacherController.publishExamInstance); // Công bố đề thi
router.post("/exam-instances/:id/unpublish", teacherController.unpublishExamInstance); // Hủy công bố đề thi
router.post("/exam-instances/:id/accommodations", teacherController.upsertAccommodation); // Thêm thời gian cho học sinh
router.get("/classes/:classId/active-students", teacherController.getActiveStudentsInClass); // Hiển thị học sinh đang thi trong lớp
router.get("/classes/:examInstanceId/flags", teacherController.getFlaggedStudentsInClass); // Danh sách vi phạm trong lớp
router.post("/exam-sessions/:id/lock", teacherController.lockExamSession); // Khóa thủ công phiên thi
router.post("/exam-sessions/:id/unlock", teacherController.unlockExamSession); // Mở khóa thủ công phiên thi

router.get("/classes/:classId/exam-instances", teacherController.getExamInstancesByClass);// Lấy tất cả exam_instance của 1 lớp học
router.get("/classes/:classId/exam-instances/:examInstanceId/progress", teacherController.getExamProgressByClass); // Lấy tiến độ làm bài thi của sinh viên trong lớp

router.get("/dashboard", teacherController.getDashboard); // Lấy thông tin dashboard của giáo viên

// ==================== XUẤT BÁO CÁO ====================
router.get("/export/students/:classId", teacherController.exportStudents); // Xuất danh sách học sinh trong lớp CSV
router.get("/export/results/:examId", teacherController.exportResults); // Xuất kết quả thi CSV
router.get("/export/logs/:examId", teacherController.exportLogs); // Xuất nhật ký thi CSV

router.get("/classes/:classId/exam-instances/:examInstanceId/scores", teacherController.getStudentScoresInClass);   // giáo viên lấy danh sách điểm của sinh viên trong lớp ở một kỳ thi
router.get("/classes/:classId/exam-templates", teacherController.getExamTemplatesByClass); // lấy danh sách template đề thi theo lớp học

// ==================== NHẬP ĐỀ THI ====================
router.post(
  "/questions/import/preview",
  uploadExamFile.single("file"),
  previewExamImport
);

router.post(
  "/questions/import/confirm",
  confirmExamImport
);

module.exports = router;