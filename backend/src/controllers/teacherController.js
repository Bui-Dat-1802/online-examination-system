const teacherService = require('../services/teacherService');
const crypto = require('crypto');

function generateRandomCode(len = 8) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.randomBytes(len);
    let out = "";
    for (let i = 0; i < len; i++) {
        out += chars[bytes[i] % chars.length];
    }
    return out;
}
module.exports = {
    // Tạo lớp học mới  
    async createClass(req, res, next) {
        try {
            const { name, description } = req.body;
            const classCode = generateRandomCode(8);
            const teacherId = req.user.id; // Giả sử bạn có thông tin giáo viên trong req.user
            const newClass = await teacherService.createClass(name, description, teacherId, classCode);
            res.status(201).json({ newClass, message: "Lớp học đã được tạo thành công" });
        } catch (error) {
            const err = new Error("Tạo lớp học thất bại");
            err.status = 400;
            next(err);
        }
    },
    //Hiển thị danh sách lớp học của giáo viên
    async getClassesByTeacher(req, res, next) {
        try {
            const teacherId = req.user.id;
            const includeDeleted = req.query.includeDeleted === 'true';
            const classes = await teacherService.getClassesByTeacher(teacherId, { includeDeleted });
            res.json(classes);
        } catch (error) {
            const err = new Error("Lấy danh sách lớp học thất bại");
            err.status = 400;
            next(err);
        }
    },
    // Lấy thông tin lớp học theo ID
    async getClassById(req, res, next) {
        try {
            const classId = (req.params.id);
            const includeDeleted = req.query.includeDeleted === 'true';
            const classData = await teacherService.getClassById(classId, { includeDeleted });
            for (let i = 0; i < classData["listStudent"].length; i++) {
                const studentId = classData["listStudent"][i]["student_id"];
                const studentInfo = await require('../services/userService').getUserById(studentId);
                classData["listStudent"][i]["studentInfo"] = studentInfo;
            }
            res.json(classData);
        } catch (error) {
            const err = new Error("Lấy thông tin lớp học thất bại");
            err.status = 400;
            next(err);
        }
    },
    // Cập nhật thông tin lớp học
    async updateClass(req, res, next) {
        try {
            const classId = (req.params.id);
            const updateData = req.body;
            const updatedClass = await teacherService.updateClass(classId, updateData);
            res.json({ updatedClass, message: "Cập nhật lớp học thành công" });
        } catch (error) {
            const err = new Error('Cập nhật thất bại');
            err.status = 400;
            next(err);
        }
    },
    // Xóa lớp học (soft delete)
    async deleteClass(req, res, next) {
        try {
            const classId = (req.params.id);
            const teacherId = req.user.id;
            const result = await teacherService.deleteClass(classId, teacherId);
            res.json(result);
        } catch (error) {
            const err = new Error('Xóa lớp học thất bại');
            err.status = 400;
            next(err);
        }
    },

    // Khôi phục lớp học
    async restoreClass(req, res, next) {
        try {
            const classId = req.params.id;
            const teacherId = req.user.id;
            const result = await teacherService.restoreClass(classId, teacherId);
            res.json(result);
        } catch (error) {
            const err = new Error('Khôi phục lớp học thất bại');
            err.status = 400;
            next(err);
        }
    },
    // Hiển thị danh sách yêu cầu tham gia lớp học
    async getEnrollmentRequests(req, res, next) {
        try {
            const classId = (req.params.id);
            const teacherId = req.user.id;
            const requests = await teacherService.getEnrollmentRequests(classId, teacherId);
            res.json(requests);
        } catch (error) {
            const err = new Error("Lấy danh sách yêu cầu tham gia lớp học thất bại");
            err.status = 400;
            next(err);
        }
    },
    // Phê duyệt hoặc từ chối yêu cầu tham gia lớp học
    async approveEnrollmentRequest(req, res, next) {
        try {
            const { status, requestId } = req.body; // 'approved' hoặc 'rejected'
            // const teacherId = req.user.id;
            const result = await teacherService.approveEnrollmentRequest(requestId, status);
            res.json({ message: "Cập nhật trạng thái yêu cầu thành công" });
        } catch (error) {
            const err = new Error("Cập nhật trạng thái yêu cầu thất bại");
            err.status = 400;
            next(err);
        }
    },

   // tạo câu hỏi
    async addQuestion(req, res, next) {
        try {
            const teacherId = req.user.id;
            const questionData = req.body || {};

            const { text, choices, type, correct_text_answer } = questionData;

            // 1. Validate text
            if (!text || typeof text !== "string" || text.trim().length === 0) {
                return res.status(400).json({
                    error: "Nội dung câu hỏi là bắt buộc"
                });
            }

            // 2. Validate type
            if (!type) {
                return res.status(400).json({
                    error: "Loại câu hỏi (type) là bắt buộc"
                });
            }

            //  VALIDATE THEO TYPE
            if (type === "FILL_IN_THE_BLANK") {
                if (!correct_text_answer || typeof correct_text_answer !== "string") {
                    return res.status(400).json({
                        error: "Câu điền đáp án phải có correct_text_answer"
                    });
                }

            } else if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
                if (!Array.isArray(choices) || choices.length < 2) {
                    return res.status(400).json({
                        error: "Câu hỏi trắc nghiệm phải có ít nhất 2 lựa chọn"
                    });
                }

                // phải có ít nhất 1 đáp án đúng
                if (!choices.some(c => !!c.is_correct)) {
                    return res.status(400).json({
                        error: "Ít nhất một lựa chọn phải có is_correct=true"
                    });
                }

                // optional: enforce SINGLE chỉ có 1 đáp án đúng
                if (type === "SINGLE_CHOICE") {
                    const correctCount = choices.filter(c => !!c.is_correct).length;
                    if (correctCount !== 1) {
                        return res.status(400).json({
                            error: "Câu SINGLE_CHOICE chỉ được có đúng 1 đáp án đúng"
                        });
                    }
                }

            } else {
                return res.status(400).json({
                    error: "Loại câu hỏi không hợp lệ"
                });
            }

            const newQuestion = await teacherService.addQuestion(questionData, teacherId);

            res.status(201).json({
                newQuestion,
                message: "Câu hỏi đã được thêm thành công"
            });

        } catch (error) {
            next(Object.assign(new Error("Thêm câu hỏi thất bại"), { status: 400, cause: error }));
        }
    },
    // Hiển thị danh sách câu hỏi
    async getQuestionsbyTeacher(req, res, next) {
        try {
            const teacherId = req.user.id;
            const questions = await teacherService.getQuestionsbyTeacher(teacherId);
            res.json(questions);
        } catch (error) {
            const err = new Error("Lấy danh sách câu hỏi thất bại");
            err.status = 400;
            next(err);
        }
    },

    // Chỉnh sửa câu hỏi
    async updateQuestion(req, res, next) {
        try {
            const questionId = req.params.id;
            const updateData = req.body || {};

            const { text, choices, type, correct_text_answer } = updateData;

            // 1. Validate text (cho phép update từng phần → chỉ check nếu có gửi)
            if (text !== undefined) {
                if (typeof text !== "string" || text.trim().length === 0) {
                    return res.status(400).json({
                        error: "Nội dung câu hỏi không hợp lệ"
                    });
                }
            }

            // 2. Validate type nếu có truyền
            if (type !== undefined) {

                if (type === "FILL_IN_THE_BLANK") {

                    // không cần choices
                    // cần correct_text_answer
                    if (!correct_text_answer || typeof correct_text_answer !== "string") {
                        return res.status(400).json({
                            error: "Câu điền đáp án phải có correct_text_answer"
                        });
                    }

                } else if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {

                    // nếu có update choices thì validate
                    if (choices !== undefined) {
                        if (!Array.isArray(choices) || choices.length < 2) {
                            return res.status(400).json({
                                error: "Câu hỏi trắc nghiệm phải có ít nhất 2 lựa chọn"
                            });
                        }

                        if (!choices.some(c => !!c.is_correct)) {
                            return res.status(400).json({
                                error: "Ít nhất một lựa chọn phải có is_correct=true"
                            });
                        }

                        // enforce SINGLE chỉ có 1 đáp án đúng
                        if (type === "SINGLE_CHOICE") {
                            const correctCount = choices.filter(c => !!c.is_correct).length;
                            if (correctCount !== 1) {
                                return res.status(400).json({
                                    error: "Câu SINGLE_CHOICE chỉ được có đúng 1 đáp án đúng"
                                });
                            }
                        }
                    }

                } else {
                    return res.status(400).json({
                        error: "Loại câu hỏi không hợp lệ"
                    });
                }
            }

            // 3. Nếu KHÔNG có type nhưng có choices → assume vẫn là trắc nghiệm
            if (type === undefined && choices !== undefined) {
                if (!Array.isArray(choices) || choices.length < 2) {
                    return res.status(400).json({
                        error: "Câu hỏi phải có ít nhất 2 lựa chọn"
                    });
                }

                if (!choices.some(c => !!c.is_correct)) {
                    return res.status(400).json({
                        error: "Ít nhất một lựa chọn phải có is_correct=true"
                    });
                }
            }

            // CALL SERVICE
            const updatedQuestion = await teacherService.updateQuestion(questionId, updateData);

            res.json({
                updatedQuestion,
                message: "Cập nhật câu hỏi thành công"
            });

        } catch (error) {
            next(Object.assign(new Error("Cập nhật câu hỏi thất bại"), {
                status: 400,
                cause: error
            }));
        }
    },

    // Xóa câu hỏi - Dat
    async deleteQuestion(req, res, next) {
        try {
            const questionId = req.params.id;
            const teacherId = req.user.id;
            await teacherService.deleteQuestion(questionId, teacherId);
            res.status(200).json({ message: "Xóa câu hỏi thành công" });
        } catch (error) {
            const err = new Error('Xóa câu hỏi thất bại');
            console.error("Error stack:", error.stack);
            err.status = 400;
            next(err);
        }
    },

    // Khôi phục câu hỏi
    async restoreQuestion(req, res, next) {
        try {
            const questionId = req.params.id;
            const teacherId = req.user.id;
            await teacherService.restoreQuestion(questionId, teacherId);
            res.status(200).json({ message: "Khôi phục câu hỏi thành công" });
        } catch (error) {
            const err = new Error('Khôi phục câu hỏi thất bại');
            err.status = 400;
            next(err);
        }
    },

    // Khôi phục câu hỏi
    async restoreQuestion(req, res, next) {
        try {
            const questionId = req.params.id;
            const teacherId = req.user.id;
            await teacherService.restoreQuestion(questionId, teacherId);
            res.status(200).json({ message: "Khôi phục câu hỏi thành công" });
        } catch (error) {
            const err = new Error('Khôi phục câu hỏi thất bại');
            err.status = 400;
            next(err);
        }
    },

    // lấy chi tiết câu hỏi theo ID cau hỏi - Dat
    async getQuestionById(req, res, next) {
        try {
            const questionId = req.params.id;
            const question = await teacherService.getQuestionById(questionId);
            res.json(question);
        } catch (error) {
            const err = new Error("Lấy chi tiết câu hỏi thất bại");
            err.status = 400;
            next(err);
        }
    },

    async createExamTemplate(req, res, next) {
        try {
            const teacherId = req.user.id;
            let { title, description, class_id, duration_seconds, shuffle_questions, passing_score } = req.body;

            // Convert kiểu dữ liệu
            if (duration_seconds) {
                duration_seconds = parseInt(duration_seconds, 10);
            }
            if (typeof shuffle_questions === 'string') {
                shuffle_questions = shuffle_questions.toLowerCase() === 'true';
            }
            if (passing_score) {
                passing_score = parseFloat(passing_score);
            }
            if (!title || typeof title !== "string" || title.trim().length === 0) {
                const err = new Error("Tiêu đề mẫu đề thi là bắt buộc");
                err.status = 400;
                throw err;
            }
            if (!class_id) {
                const err = new Error("Cần có mã lớp học để tạo mẫu đề thi");
                err.status = 400;
                throw err;
            }
            else {
                const classData = await teacherService.getClassById(class_id);
                console.log("Class data for validation:", classData);
                console.log("Teacher ID for validation:", teacherId,  classData.classInfo.teacher_id);
                if (!classData || classData.classInfo.teacher_id !== teacherId) {
                    const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền thêm đề thi vào lớp này");
                    err.status = 403;
                    throw err;
                }
            }
            if (duration_seconds && (isNaN(duration_seconds) || duration_seconds <= 0)) {
                const err = new Error("Thời gian làm bài phải là số dương");
                err.status = 400;
                throw err;
            }
            if (passing_score && (isNaN(passing_score) || passing_score < 0 || passing_score > 100)) {
                const err = new Error("Điểm đạt phải là số từ 0 đến 100");
                err.status = 400;
                throw err;
            }

            const templateData = { title, description, class_id, duration_seconds, shuffle_questions, passing_score };
            console.log("Creating exam template with data:", templateData);
            console.log("Teacher ID:", teacherId);
            const newTemplate = await teacherService.createExamTemplate(templateData, class_id, teacherId);
            res.status(201).json({ newTemplate, message: "Mẫu đề thi đã được tạo thành công" });
        } catch (error) {
            console.error("createExamTemplate error:", error);
            console.error("Error stack:", error.stack);

            const err = new Error("Tạo mẫu đề thi thất bại");
            err.status = error.status || 400;
            err.cause = error.message;  // Gắn lỗi gốc vào
            next(err);
        }
    },
    async getExamTemplatesByTeacher(req, res, next) {
        try {
            const teacherId = req.user.id;
            const includeDeleted = req.query.includeDeleted === 'true';
            const templates = await teacherService.getExamTemplate(teacherId, { includeDeleted });
            res.json(templates);
        } catch (error) {
            const err = new Error("Lấy danh sách mẫu đề thi thất bại");
            err.status = 400;
            next(err);
        }
    },
    // Cập nhật template 
    async updateExamTemplate(req, res, next) {
        try {
            const templateId = req.params.id;
            const updateData = req.body || {};
            const updatedTemplate = await teacherService.updateExamTemplate(templateId, updateData);
            res.json({ updatedTemplate, message: "Cập nhật mẫu đề thi thành công" });
        } catch (error) {
            console.error("updateExamTemplate error:", error);
            console.error("Error stack:", error.stack);
            const err = new Error("Cập nhật mẫu đề thi thất bại");
            err.status = 400;
            next(err);
        }
    },
    // Xóa template đề thi
    async deleteExamTemplate(req, res, next) {
        try {
            const templateId = req.params.id;
            const teacherId = req.user.id;
            await teacherService.deleteExamTemplate(templateId, teacherId);
            res.json({ message: "Xóa mẫu đề thi thành công" });
            res.status(200).end();
        } catch (error)
        {
            // console.error("deleteExamTemplate error:", error);
            // console.error("Error stack:", error.stack);
            // // const err = new Error("Xóa mẫu đề thi thất bại");
            // err.status = 400;
            const err = new Error('Xóa mẫu đề thi thất bại: Không được xóa mẫu đề thi đã có đề thi được tạo từ nó');
            err.status = 400;
            next(err);

        }
    },

    // Khôi phục exam template
    async restoreExamTemplate(req, res, next) {
        try {
            const templateId = req.params.id;
            const teacherId = req.user.id;
            const result = await teacherService.restoreExamTemplate(templateId, teacherId);
            res.json(result);
        } catch (error) {
            const err = new Error('Khôi phục mẫu đề thi thất bại');
            err.status = 400;
            next(err);
        }
    },

    // tìm kiếm template theo từ khóa trong tiêu đề 
    async searchExamTemplates(req, res, next) {
        try {
            const teacherId = req.user.id;
            const keyword = req.query.keyword || "";
            const templates = await teacherService.searchExamTemplates(teacherId, keyword);
            res.json(templates);
        } catch (error) {
            // const err = new Error("Tìm kiếm mẫu đề thi thất bại");
            // err.status = 400;
            next(error);
        }
    },
    // tìm kiếm template theo ID
    async getExamTemplateById(req, res, next){
        try {
            const teacherId = req.user.id;
            const templateId = req.params.id;
            const templates = await teacherService.getExamTemplateById(teacherId,templateId);
            res.json(templates);
        } catch (error){
            next(error);
        }
    },


    // const questionData = req.body || {};
    // const questionFields = { ...questionData };
    // const newQuestion = await teacherService.addQuestion(questionData, teacherId);
    //         res.status(201).json({ newQuestion, message: "Câu hỏi đã được thêm thành công" });
    //     } catch (error) {
    //         next(Object.assign(new Error("Thêm câu hỏi thất bại"), { status: 400, cause: error }));
    //     }
    // }

    //tạo instance đề thi
    async createExamInstance(req, res, next) { {
        try {
            const teacherId = req.user.id;
            let { templateId, starts_at, ends_at, published, show_answers, scoring_mode } = req.body || {};

            // Convert kiểu dữ liệu
            if (typeof published === 'string') {
                published = published.toLowerCase() === 'true';
            }
            if (!templateId) {
                const err = new Error("Cần có mã mẫu đề thi để tạo đề thi");
                err.status = 400;
                throw err;
            }
            if (!starts_at || !ends_at) {
                const err = new Error("Thiếu thời gian bắt đầu hoặc kết thúc bài thi");
                err.status = 400;
                throw err;
            }
            const startDate = new Date(starts_at);
            const endDate = new Date(ends_at);
            if (startDate >= endDate) {
                const err = new Error("Thời gian bắt đầu phải trước thời gian kết thúc");
                err.status = 400;
                throw err;
            }
            // kiểm tra thời gian là tương lai không
            const now = new Date();
            if (startDate <= now) {
                const err = new Error("Thời gian bắt đầu phải là tương lai");
                err.status = 400;
                throw err;
            }
            if (typeof show_answers === 'string') {
                show_answers = show_answers.toLowerCase() === 'true';
            }

            const allowedModes = ["ALL_OR_NOTHING", "PARTIAL_WITH_PENALTY"];
            if (
                scoring_mode &&
                !allowedModes.includes(scoring_mode)
            ) {
                const err = new Error("Kiểu chấm điểm không hợp lệ");
                err.status = 400;
                throw err;
            }
            const instanceData = req.body || {};
            const newInstance = await teacherService.addExam_instance(instanceData, teacherId);
            res.status(201).json({ newInstance, message: "Đề thi đã được tạo thành công" });
        } catch (error) {
            next(error);
        }
    }},

    // Xóa instace đề thi
    async deleteExamInstance(req, res, next) {
        try {
            const instanceId = req.params.id;
            const teacherId = req.user.id;
            await teacherService.deleteExam_instance(instanceId, teacherId);
            res.json({ message: "Xóa đề thi thành công" });
            res.status(200).end();
        } catch (error) {
            const err = new Error("Xóa đề thi thất bại");
            err.status = 400;
            next(err);
        }
    },

    // Khôi phục exam instance
    async restoreExamInstance(req, res, next) {
        try {
            const instanceId = req.params.id;
            const teacherId = req.user.id;
            await teacherService.restoreExamInstance(instanceId, teacherId);
            res.json({ message: "Khôi phục đề thi thành công" });
        } catch (error) {
            const err = new Error("Khôi phục đề thi thất bại");
            err.status = 400;
            next(err);
        }
    },

    // lấy danh sách instance đề thi theo template - Dat
    async getExamInstancesByTemplate(req, res, next) {
        try {
            const templateId = req.params.templateId;
            const teacherId = req.user.id;
            const instances = await teacherService.getExamInstancesByTemplate(templateId, teacherId);
            res.json(instances);
        } catch (error) {
            next(error);
        }
    },

    // sửa instance đề thi
    async updateExamInstance(req, res, next) {
        try {
            const instanceId = req.params.id;
            const updateData = req.body || {};
            const teacherId = req.user.id;
            const updatedInstance = await teacherService.updateExamInstance(instanceId, teacherId, updateData);
            res.json({ updatedInstance, message: "Cập nhật đề thi thành công" });   
        } catch (error) {
            next(error);
        }
    },

    // lấy instance đề thi theo ID 
    async getExamInstanceById(req, res, next) {
        try {
            const instanceId = req.params.id;
            const teacherId = req.user.id;
            const instance = await teacherService.getExamInstanceById(instanceId, teacherId);
            res.json(instance);
        } catch (error) {
            next(error);
        }
    },

    // tìm kiếm sinh viên trong lớp học theo tên
    async searchStudentsInClass(req, res, next) { {
        try {
            const classId = req.params.classId;
            const keyword = req.query.keyword;
            const teacherId = req.user.id;
            const students = await teacherService.searchStudentsInClass(teacherId, classId, keyword);
            res.json(students);
        } catch (error) {
            next(error);
        }
    }},

    // công bố đề thi
    async publishExamInstance(req, res, next) {
        try {
            const instanceId = req.params.id;
            const teacherId = req.user.id;
            await teacherService.publishExamInstance(instanceId, teacherId);
            res.json({ message: "Công bố đề thi thành công" });
        } catch (error) {
            next(error);
        }
    },

    // hủy công bố đề thi
    async unpublishExamInstance(req, res, next) {
        try {
            const instanceId = req.params.id;
            const teacherId = req.user.id;
            await teacherService.unpublishExamInstance(instanceId, teacherId);
            res.json({ message: "Hủy công bố đề thi thành công" });
        } catch (error) {
            next(error);
        }
    },

    // Thêm/ghi đè thời gian cộng thêm cho học sinh trong một đề thi
    async upsertAccommodation(req, res, next) {
        try {
            const teacherId = req.user.id;
            const examInstanceId = req.params.id;
            let { student_id, extra_seconds, add_seconds, notes } = req.body || {};

            // validate input
            if (!student_id) {
                const err = new Error("Thiếu student_id");
                err.status = 400;
                throw err;
            }
            // at least one of extra_seconds or add_seconds
            const hasExtra = extra_seconds !== undefined && extra_seconds !== null;
            const hasAdd = add_seconds !== undefined && add_seconds !== null;
            if (!hasExtra && !hasAdd) {
                const err = new Error("Cần cung cấp extra_seconds (tuyệt đối) hoặc add_seconds (cộng dồn)");
                err.status = 400;
                throw err;
            }
            const parsedExtra = hasExtra ? parseInt(extra_seconds, 10) : undefined;
            const parsedAdd = hasAdd ? parseInt(add_seconds, 10) : undefined;
            if (hasExtra && (Number.isNaN(parsedExtra) || parsedExtra < 0)) {
                const err = new Error("extra_seconds phải là số không âm");
                err.status = 400;
                throw err;
            }
            if (hasAdd && (Number.isNaN(parsedAdd) || parsedAdd < 0)) {
                const err = new Error("add_seconds phải là số không âm");
                err.status = 400;
                throw err;
            }

            const result = await teacherService.upsertAccommodation({
                teacherId,
                examInstanceId,
                studentId: student_id,
                extraSeconds: parsedExtra,
                addSeconds: parsedAdd,
                notes,
            });

            // Nếu cần broadcast WebSocket update
            if (result.needsBroadcast) {
                const io = req.app.get('io');
                if (io) {
                    const { broadcastTimeUpdate } = require('../sockets/examTimer');
                    // Broadcast update cho học sinh cụ thể
                    broadcastTimeUpdate(io, result.examInstanceId, result.studentId);
                }
            }

            res.status(200).json({ 
                accommodation: result.accommodation, 
                message: "Cập nhật thêm thời gian thành công" 
            });
        } catch (error) {
            next(error);
        }
    },

    // Hiển thị các học sinh đang có phiên thi 'started' trong một lớp
    async getActiveStudentsInClass(req, res, next) {
        try {
            const teacherId = req.user.id;
            const classId = req.params.classId;
            const students = await teacherService.listActiveStudentsInClass(teacherId, classId);
            res.json(students);
        } catch (error) {
            next(error);
        }
    },

    // Hiển thị danh sách flag vi phạm của học sinh trong lớp
    async getFlaggedStudentsInClass(req, res, next) {
        try {
            // const teacherId = req.user.id;
            const exam_instance_id = req.params.examInstanceId;
            const flags = await teacherService.listFlaggedSessionsByClass(exam_instance_id);
            res.json(flags);
        } catch (error) {
            next(error);
        }
    },

    // Khóa thủ công phiên thi
    async lockExamSession(req, res, next) {
        try {
            const teacherId = req.user.id;
            const sessionId = req.params.id;
            const { reason } = req.body || {};
            const result = await teacherService.lockExamSession(sessionId, teacherId, reason);
            res.json({ ...result, message: "Khóa phiên thi thành công" });
        } catch (error) {
            next(error);
        }
    },

    // Mở khóa thủ công phiên thi
    async unlockExamSession(req, res, next) {
        try {
            const teacherId = req.user.id;
            const sessionId = req.params.id;
            const { reason } = req.body || {};
            const result = await teacherService.unlockExamSession(sessionId, teacherId, reason);
            res.json({ ...result, message: "Mở khóa phiên thi thành công" });
        } catch (error) {
            next(error);
        }
    },

    // Lấy tất cả exam_instance của 1 lớp học
    async getExamInstancesByClass(req, res, next) {
        try {
            const teacherId = req.user.id;
            const classId = req.params.classId;
            const instances = await teacherService.getExamInstancesByClass(teacherId, classId);
            res.json(instances);
        } catch (error) {
            next(error);
        }
    },

    // Lấy tiến độ làm bài thi của sinh viên trong lớp
    async getExamProgressByClass(req, res, next) {
        try {
            const teacherId = req.user.id;
            const classId = req.params.classId;
            const examInstanceId = req.params.examInstanceId;
            const progress = await teacherService.getExamProgressByClass(teacherId, classId, examInstanceId);
            res.json(progress);
        } catch (error) {
            next(error);
        }
    },

    // Lấy thông tin dashboard của giáo viên
    async getDashboard(req, res, next) {
        try {
            const teacherId = req.user.id;
            const dashboardData = await teacherService.getDashboardStats(teacherId);
            res.json(dashboardData);
        } catch (error) {
            const err = new Error("Lấy thông tin dashboard thất bại");
            err.status = 400;
            next(err);
        }
    },

    /**
     * GET /teacher/export/students/:classId
     * Xuất danh sách học sinh trong lớp ra CSV
     */
    async exportStudents(req, res, next) {
        try {
            const { classId } = req.params;
            const teacherId = req.user.id;
            const csv = await teacherService.exportStudentList(classId, teacherId);

            // Set headers cho file CSV
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="danh-sach-hoc-sinh-${classId}-${Date.now()}.csv"`);

            // Gửi CSV với BOM để Excel đọc UTF-8 đúng
            res.send('\uFEFF' + csv);
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /teacher/export/results/:examId
     * Xuất kết quả thi ra CSV
     */
    async exportResults(req, res, next) {
        try {
            const { examId } = req.params;
            const teacherId = req.user.id;
            const csv = await teacherService.exportExamResults(examId, teacherId);

            // Set headers cho file CSV
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="ket-qua-thi-${examId}-${Date.now()}.csv"`);

            // Gửi CSV với BOM để Excel đọc UTF-8 đúng
            res.send('\uFEFF' + csv);
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /teacher/export/logs/:examId
     * Xuất nhật ký thi ra CSV
     */
    async exportLogs(req, res, next) {
        try {
            const { examId } = req.params;
            const teacherId = req.user.id;
            const csv = await teacherService.exportExamLogs(examId, teacherId);

            // Set headers cho file CSV
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="nhat-ky-thi-${examId}-${Date.now()}.csv"`);

            // Gửi CSV với BOM để Excel đọc UTF-8 đúng
            res.send('\uFEFF' + csv);
        } catch (err) {
            next(err);
        }
    },

    // giáo viên lấy danh sách điểm của sinh viên trong lớp ở một kỳ thi
    async getStudentScoresInClass(req, res, next) {
        try {
            const teacherId = req.user.id;
            const classId = req.params.classId;
            const examInstanceId = req.params.examInstanceId;
            const scores = await teacherService.getStudentScoresInClass(teacherId, classId, examInstanceId);
            res.json(scores);
        } catch (error) {
            next(error);
        }
    },

    // Lấy danh sách template đề thi theo lớp học
    async getExamTemplatesByClass(req, res, next) {
        try {
            const teacherId = req.user.id;
            const classId = req.params.classId;
            const includeDeleted = req.query.includeDeleted === 'true';
            const templates = await teacherService.getExamTemplatesByClass(teacherId, classId, { includeDeleted });
            res.json(templates);
        } catch (error) {
            next(error);
        }
    },
    async removeStudentFromClass(req, res, next) {
        try {
            const { classId, studentId } = req.params;
            const teacherId = req.user.id;
            console.log("Removing student:", studentId, "from class:", classId, "by teacher:", teacherId);
            await teacherService.removeStudentFromClass(teacherId, classId, studentId);
            res.status(200).json({ message: "Xóa học sinh khỏi lớp học thành công" });
        } catch (error) {
            const err = new Error("Xóa học sinh khỏi lớp học thất bại");
            err.status = 400;
            next(error);
        }
    },
};
