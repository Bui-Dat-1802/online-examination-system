const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// router.post("/register", authController.register);
router.post("/register-request", authController.registerRequest); // đăng ký
router.post("/register-confirm", authController.registerConfirm); // xác nhận otp để đăng ký
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout); 

router.post("/forgot-password", authController.forgotPassword); // quên mật khẩu
router.post("/reset-password", authController.resetPassword);   // đặt lại mật khẩu


router.get("/classes/search", authController.searchClassesByName);    // tìm kiếm lớp học theo tên

module.exports = router;