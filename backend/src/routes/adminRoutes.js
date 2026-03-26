const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// ==================== THỐNG KÊ ====================
router.get("/statistics", adminController.getStatistics); // Lấy thống kê tổng quan hệ thống

// ==================== QUẢN LÝ NGƯỜI DÙNG ====================
router.get("/users", adminController.getUsers); // Lấy danh sách người dùng với bộ lọc
router.get("/users/:id", adminController.getUserById); // Lấy thông tin chi tiết một người dùng

// ==================== KIỂM SOÁT TÀI KHOẢN ====================
router.put("/users/:id/lock", adminController.lockUser); // Khóa tài khoản người dùng
router.put("/users/:id/unlock", adminController.unlockUser); // Mở khóa tài khoản người dùng
router.post("/users/:id/reset-password", adminController.resetPassword); // Reset mật khẩu người dùng

// ==================== QUẢN LÝ LỚP HỌC ====================
router.get("/classes", adminController.getClasses); // Lấy danh sách tất cả lớp học
router.get("/classes/:id", adminController.getClassById); // Lấy thông tin chi tiết lớp học
router.delete("/classes/:id", adminController.deleteClass); // Xóa (soft delete) lớp học

// ==================== QUẢN LÝ KỲ THI ====================
router.get("/exams", adminController.getExams); // Lấy danh sách tất cả kỳ thi
router.get("/exams/:id", adminController.getExamById); // Lấy thông tin chi tiết kỳ thi

// ==================== DASHBOARD & BÁO CÁO ====================
router.get("/dashboard", adminController.getDashboard); // Lấy thống kê dashboard tổng quan
router.get("/activities", adminController.getActivities); // Lấy lịch sử hoạt động của admin

// ==================== XUẤT BÁO CÁO ====================
router.get("/export/students", adminController.exportStudents); // Xuất danh sách học sinh CSV
router.get("/export/results/:examId", adminController.exportResults); // Xuất kết quả thi CSV
router.get("/export/logs/:examId", adminController.exportLogs); // Xuất nhật ký thi CSV


module.exports = router;
