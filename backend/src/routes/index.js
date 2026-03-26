const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const teacher = require("../middleware/teacher");
const student = require("../middleware/student");
const admin = require("../middleware/admin");

router.use("/auth", require("./authRoutes"));
router.use("/users",auth, require("./userRoutes"));

router.use("/teacher", auth, teacher, require("./teacherRoutes"));

router.use("/student", auth, student, require("./studentRoutes"));

router.use("/admin", auth, admin, require("./adminRoutes"));
// router.use("/classes", require("./classRoutes"));
// router.use("/exams", require("./examRoutes"));

module.exports = router;
