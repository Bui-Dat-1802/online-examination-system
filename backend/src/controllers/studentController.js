const studentService = require("../services/studentService");
const examSessionMiddleware = require("../middleware/examSession");

module.exports = {
    // Tham gia lớp học bằng mã lớp
    async joinClass(req, res, next) {
        try {
            const studentId = req.user.id;
            const { classCode, note } = req.body;
            const enrollmentRequest = await studentService.joinClass(studentId, classCode, note);
            res.status(201).json({ enrollmentRequest, message: "Yêu cầu tham gia lớp học đã được gửi" });
        } catch (error) {
            const err = new Error("Tham gia lớp học thất bại: " + error.message);
            err.status = 400;
            next(err);
        }
    },
    // Lấy danh sách lớp học đã tham gia
    async getEnrolledClasses(req, res, next) {
        try {
            const studentId = req.user.id;
            const status = req.query.status;
            const classes = await studentService.getEnrolledClasses(studentId, status);
            res.json(classes);
        } catch (error) {
            next(error);
        }
    },
    // Rời lớp học
    async leaveClass(req, res, next) {
        try {
            const studentId = req.user.id;
            const classId = req.params.id;
            await studentService.leaveClass(studentId, classId);
            res.status(204).end();
        } catch (error) {
            const err = new Error("Rời lớp học thất bại");
            err.status = 400;
            next(err);
        }
    },

    // Lấy danh sách đề thi theo lớp học
    async getExamsByClass(req, res, next) {
        try {
            const studentId = req.user.id;
            const classId = req.params.id;
            const exams = await studentService.getExamsByClass(studentId, classId);
            res.json(exams);
        } catch (error) {
            const err = new Error("Lấy danh sách đề thi thất bại: " + error.message);
            err.status = 400;
            next(err);
        }
    },

    // Bắt đầu kỳ thi: tạo phiên làm bài
    async startExam(req, res, next) {
        try {
            const studentId = req.user.id;
            const examId = req.params.id;
            const clientMeta = {
                ip: req.ip,
                userAgent: req.headers["user-agent"],
            };
            const sessionInfo = await studentService.startExam(studentId, examId, clientMeta);
            res.status(201).json(sessionInfo);
        } catch (error) {
            const err = new Error("Bắt đầu kỳ thi thất bại: " + error.message);
            err.status = error.status || 400;
            next(err);
        }
    },

    // Lấy danh sách câu hỏi theo phiên
    async getSessionQuestions(req, res, next) {
        try {
            const studentId = req.user.id;
            const sessionId = req.params.id;
            const questions = await studentService.getSessionQuestions(sessionId, studentId);
            res.json(questions);
        } catch (error) {
            const err = new Error("Lấy câu hỏi thất bại: " + error.message);
            err.status = error.status || 400;
            next(err);
        }
    },

    // Heartbeat phiên thi
    async heartbeat(req, res, next) {
        try {
            const studentId = req.user.id;
            const sessionId = req.params.id;
            const payload = {
                focusLost: !!req.body?.focusLost,
                ip: req.ip,
                userAgent: req.headers["user-agent"],
            };
            const result = await studentService.heartbeatSession(sessionId, studentId, payload);
            res.json(result);
        } catch (error) {
            const err = new Error("Heartbeat thất bại: " + error.message);
            err.status = error.status || 400;
            next(err);
        }
    },

    // Lưu/ghi đè đáp án của một câu hỏi trong phiên
    async submitAnswer(req, res, next) {
        try {
            const studentId = req.user.id;
            const sessionId = req.params.id;
            const { question_id, choice_ids, choice_id } = req.body;
            const payloadIds = Array.isArray(choice_ids) ? choice_ids : (choice_id ? [choice_id] : []);
            if (!question_id || !payloadIds || payloadIds.length === 0) {
                const err = new Error("Thiếu question_id hoặc choice_ids");
                err.status = 400;
                throw err;
            }
            const saved = await studentService.upsertAnswer(sessionId, studentId, question_id, payloadIds);
            res.status(200).json(saved);
        } catch (error) {
            const err = new Error("Lưu đáp án thất bại: " + error.message);
            err.status = error.status || 400;
            next(err);
        }
    },

    // Nộp bài: chuyển state sang submitted, tính điểm
    async submitExam(req, res, next) {
        try {
            const studentId = req.user.id;
            const sessionId = req.params.id;
            const result = await studentService.submitExam(sessionId, studentId);
            res.status(200).json(result);
        } catch (error) {
            const err = new Error("Nộp bài thất bại: " + error.message);
            err.status = error.status || 400;
            next(err);
        }
    },

    // hủy yêu cầu tham gia lớp học
    async cancelEnrollmentRequest(req, res, next) {
        try {
            const studentId = req.user.id;
            const classId = req.params.id;
            await studentService.cancelEnrollmentRequest(studentId, classId);
            res.status(204).end();
        } catch (error) {
            const err = new Error("Hủy yêu cầu tham gia lớp học thất bại: " + error.message);
            err.status = 400;
            next(err);
        }
    },

    // lấy dashboard của sinh viên
    async getStudentDashboard(req, res, next) {
        try {
            const studentId = req.user.id;
            const dashboard = await studentService.getStudentDashboard(studentId);
            res.status(200).json(dashboard);
        } catch (error) {
            const err = new Error("Lấy dashboard thất bại: " + error.message);
            err.status = 400;
            next(err);
        }
    },
};