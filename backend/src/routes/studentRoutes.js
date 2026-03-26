const studentController = require("../controllers/studentController");
const express = require("express");
const router = express.Router();
const examSession = require("../middleware/examSession");

router.post("/enroll", studentController.joinClass);
router.get("/classes", studentController.getEnrolledClasses);

router.delete("/classes/:id", studentController.leaveClass);   // Rời lớp học
router.get("/exams/classes/:id", studentController.getExamsByClass);    // Lấy danh sách đề thi theo lớp học
router.post("/exams/:id/start", studentController.startExam);   // Bắt đầu kỳ thi
router.post("/classes/:id/cancel-enrollment", studentController.cancelEnrollmentRequest);   // Hủy yêu cầu tham gia lớp học

// Các endpoint theo phiên thi (yêu cầu X-Exam-Token)
router.get("/sessions/:id/questions", examSession, studentController.getSessionQuestions);
router.post("/sessions/:id/heartbeat", examSession, studentController.heartbeat);
router.post("/sessions/:id/answers", examSession, studentController.submitAnswer); // Lưu đáp án
router.post("/sessions/:id/submit", examSession, studentController.submitExam); // Nộp bài

router.get("/dashboard", studentController.getStudentDashboard);    // Lấy dashboard của sinh viên


module.exports = router;
