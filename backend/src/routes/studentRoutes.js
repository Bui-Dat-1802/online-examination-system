const studentController = require("../controllers/studentController");
const express = require("express");
const router = express.Router();
const examSession = require("../middleware/examSession");

router.post("/enroll", studentController.joinClass);
router.get("/classes", studentController.getEnrolledClasses);

router.delete("/classes/:id", studentController.leaveClass);
router.get("/exams/classes/:id", studentController.getExamsByClass);
router.get("/exams/overview", studentController.getExamOverview);
router.post("/exams/:id/start", studentController.startExam);
router.post("/classes/:id/cancel-enrollment", studentController.cancelEnrollmentRequest);

router.get("/sessions/:id/questions", examSession, studentController.getSessionQuestions);
router.post("/sessions/:id/heartbeat", examSession, studentController.heartbeat);
router.post("/sessions/:id/answers", examSession, studentController.submitAnswer);
router.post("/sessions/:id/submit", examSession, studentController.submitExam);

router.get("/dashboard", studentController.getStudentDashboard);

module.exports = router;
