const prisma = require("../prisma");
const userService = require("../services/userService");

module.exports = {
    // Tạo lớp học mới
    async createClass(name, description, teacherId, classCode) {
        const newClass = await prisma.Renamedclass.create({
            data: {
                name,
                description,
                teacher_id: teacherId,
                code: classCode,
            },
        });
        return newClass;
    },
    // Lấy danh sách lớp học của giáo viên
    async getClassesByTeacher(teacherId, options = {}) {
        const { includeDeleted = false } = options;
        const where = { teacher_id: teacherId };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const classes = await prisma.Renamedclass.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });
        return classes;
    },
    // Lấy thông tin lớp học theo ID
    async getClassById(classId, options = {}) {
        const { includeDeleted = false } = options;
        const where = { id: classId };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const classInfo = await prisma.Renamedclass.findFirst({
            where,
        });
        const listStudent = await prisma.enrollment_request.findMany({
            where: { class_id: classId, status: "approved" },
        });
        return { classInfo, listStudent };
    },
    // Cập nhật thông tin lớp học
    async updateClass(classId, updateData) {
        updateData.updated_at = new Date();
        updateData.code = undefined; // Không cho phép cập nhật mã lớp
        const updatedClass = await prisma.Renamedclass.update({
            where: { id: classId },
            data: updateData,
        });
        return updatedClass;
    },
    // Xóa lớp học
    async deleteClass(classId, teacherId) {
        // Kiểm tra lớp học có tồn tại và quyền sở hữu
        const classData = await prisma.Renamedclass.findFirst({
            where: { id: classId, teacher_id: teacherId, is_deleted: false },
            select: {
                id: true,
                name: true,
                exam_template: {
                    where: { is_deleted: false },
                    select: {
                        id: true,
                        exam_instance: {
                            where: { is_deleted: false },
                            select: { id: true }
                        }
                    }
                }
            }
        });

        if (!classData) {
            const err = new Error("Không tìm thấy lớp học hoặc không có quyền xóa");
            err.status = 404;
            throw err;
        }

        // Soft delete với cascade xuống exam_template và exam_instance
        await prisma.$transaction(async (tx) => {
            // 1. Xóa mềm tất cả exam_instance
            const templateIds = classData.exam_template.map(t => t.id);
            if (templateIds.length > 0) {
                await tx.exam_instance.updateMany({
                    where: {
                        template_id: { in: templateIds },
                        is_deleted: false
                    },
                    data: {
                        is_deleted: true,
                        deleted_at: new Date(),
                        deleted_by: teacherId
                    }
                });

                // 2. Xóa mềm tất cả exam_template
                await tx.exam_template.updateMany({
                    where: {
                        class_id: classId,
                        is_deleted: false
                    },
                    data: {
                        is_deleted: true,
                        deleted_at: new Date(),
                        deleted_by: teacherId
                    }
                });
            }

            // 3. Xóa mềm lớp học
            await tx.Renamedclass.update({
                where: { id: classId },
                data: {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: teacherId
                }
            });
        });

        return { 
            message: "Class and related exam templates/instances archived successfully (soft deleted)",
            details: {
                templates_archived: classData.exam_template.length,
                instances_archived: classData.exam_template.reduce((sum, t) => sum + t.exam_instance.length, 0)
            }
        };
    },

    // Khôi phục lớp học
    async restoreClass(classId, teacherId) {
        const classData = await prisma.Renamedclass.findFirst({
            where: { id: classId, teacher_id: teacherId, is_deleted: true },
            select: {
                id: true,
                name: true,
                exam_template: {
                    where: { is_deleted: true },
                    select: {
                        id: true,
                        exam_instance: {
                            where: { is_deleted: true },
                            select: { id: true }
                        }
                    }
                }
            }
        });

        if (!classData) {
            const err = new Error("Không tìm thấy lớp học đã xóa hoặc không có quyền khôi phục");
            err.status = 404;
            throw err;
        }

        // Khôi phục với cascade
        await prisma.$transaction(async (tx) => {
            // 1. Khôi phục lớp học
            await tx.Renamedclass.update({
                where: { id: classId },
                data: {
                    is_deleted: false,
                    deleted_at: null,
                    deleted_by: null
                }
            });

            // 2. Khôi phục exam_template
            const templateIds = classData.exam_template.map(t => t.id);
            if (templateIds.length > 0) {
                await tx.exam_template.updateMany({
                    where: {
                        class_id: classId,
                        is_deleted: true
                    },
                    data: {
                        is_deleted: false,
                        deleted_at: null,
                        deleted_by: null
                    }
                });

                // 3. Khôi phục exam_instance
                const instanceIds = classData.exam_template.flatMap(t => t.exam_instance.map(i => i.id));
                if (instanceIds.length > 0) {
                    await tx.exam_instance.updateMany({
                        where: {
                            id: { in: instanceIds },
                            is_deleted: true
                        },
                        data: {
                            is_deleted: false,
                            deleted_at: null,
                            deleted_by: null
                        }
                    });
                }
            }
        });

        return { 
            message: "Class and related exam templates/instances restored successfully",
            details: {
                templates_restored: classData.exam_template.length,
                instances_restored: classData.exam_template.reduce((sum, t) => sum + t.exam_instance.length, 0)
            }
        };
    },
    // Hiển thị danh sách yêu cầu tham gia lớp học
    async getEnrollmentRequests(classId, teacherId) {
        const requests = await prisma.enrollment_request.findMany({
            where: { class_id: classId, status: "pending", Renamedclass: { teacher_id: teacherId } },
        });
        return requests;
    },
    // Phê duyệt hoặc từ chối yêu cầu tham gia lớp học
    async approveEnrollmentRequest(requestId, status) {
        if (status !== "approved" && status !== "rejected") {
            const err = new Error("Trạng thái không hợp lệ");
            err.status = 400;
            throw err;
        }
        if (status === "approved") {
        const request = await prisma.enrollment_request.updateMany({
            where: { id: requestId },
            data: { status: status },
        });
        return request;
        } else {
            await prisma.enrollment_request.deleteMany({
                where: { id: requestId },
            });
        }
    },
    // Tạo thêm câu hỏi
    async addQuestion( questionData, actorId) {

        const { choices = [], type, correct_text_answer, ...questionFields } = questionData;

        return await prisma.$transaction(async (tx) => {
            // Kiểm tra lớp học tồn tại và quyền của giáo viên

            // kiểm tra trường câu hỏi

            // 1. Tạo câu hỏi
            const createData = {
                text: questionFields.text.trim(),
                explanation: questionFields.explanation ?? null,
                tags: Array.isArray(questionFields.tags) ? questionFields.tags : [],
                difficulty: questionFields.difficulty ?? "medium",
                type,
                correct_text_answer: type === "FILL_IN_THE_BLANK" ? correct_text_answer?.trim() : null,
                user: { connect: { id: actorId } }
            };

            const newQuestion = await tx.question.create({
                data: createData,
            });

            // 2. Tạo danh sách đáp án nếu loại câu hỏi không phải là "FILL_IN_THE_BLANK" (chuẩn hoá input)
            if (
                type !== "FILL_IN_THE_BLANK" &&
                Array.isArray(choices) &&
                choices.length > 0
            ) {
                const mapped = choices.map((c, i) => ({
                    question_id: newQuestion.id,
                    label: c.label ?? null,
                    order: c.order ?? i,
                    text: c.text ?? "",
                    is_correct: !!c.is_correct,
                }));

                await tx.question_choice.createMany({
                    data: mapped,
                    skipDuplicates: true,
                });
            }

            // 3. Trả về question kèm danh sách choices vừa tạo (consistent shape)
            const result = await tx.question.findUnique({
                where: { id: newQuestion.id },
                include: {
                    question_choice: {
                        orderBy: { order: "asc" }
                    }
                }
            });

            return result;
        });
    },
    // Lấy danh sách câu hỏi theo giáo viên
    async getQuestionsbyTeacher(teacherId, options = {}) {
        if (!teacherId) {
            const err = new Error("Vui lòng nhập mã giáo viên");
            err.status = 400;
            throw err;
        }
        
        const { includeDeleted = false } = options;
        const where = { owner_id: teacherId };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const questions = await prisma.question.findMany({
            where,
            include: {
                question_choice: {
                    orderBy: { order: "asc" }
                }
            },
            orderBy: { created_at: "desc" }
        });
        return questions;
    },
    // Cập nhật câu hỏi
    async updateQuestion(questionId, updateData) {
        const { choices = [], type, correct_text_answer, ...questionFields } = updateData;

        return await prisma.$transaction(async (tx) => {
            // 1. Lấy question hiện tại
            const existing = await tx.question.findFirst({
                where: { id: questionId },
                include: { question_choice: true }
            });

            if (!existing) {
                const err = new Error("Question not found");
                err.status = 404;
                throw err;
            }

            const newType = type ?? existing.type;

            // 2. Chuẩn bị update question
            const qUpdate = { updated_at: new Date() };

            if (questionFields.text !== undefined)
                qUpdate.text = questionFields.text?.trim();

            if (Object.prototype.hasOwnProperty.call(questionFields, "explanation"))
                qUpdate.explanation = questionFields.explanation ?? null;

            if (Object.prototype.hasOwnProperty.call(questionFields, "tags"))
                qUpdate.tags = Array.isArray(questionFields.tags) ? questionFields.tags : [];

            if (Object.prototype.hasOwnProperty.call(questionFields, "difficulty"))
                qUpdate.difficulty = questionFields.difficulty ?? "medium";

            //  update type
            if (type !== undefined) {
                qUpdate.type = type;
            }

            //  update correct_text_answer
            if (newType === "FILL_IN_THE_BLANK") {
                if (!correct_text_answer) {
                    const err = new Error("Fill question must have correct_text_answer");
                    err.status = 400;
                    throw err;
                }
                qUpdate.correct_text_answer = correct_text_answer.trim();
            } else {
                // nếu chuyển từ fill -> trắc nghiệm thì xoá text answer
                qUpdate.correct_text_answer = null;
            }

            await tx.question.update({
                where: { id: questionId },
                data: qUpdate,
            });

            const existingChoices = existing.question_choice || [];

            // CASE 1: FILL_IN_THE_BLANK
            if (newType === "FILL_IN_THE_BLANK") {

                const existingChoiceIds = existingChoices.map(c => c.id);

                if (existingChoiceIds.length > 0) {
                    // xoá answer liên quan
                    await tx.answer.deleteMany({
                        where: {
                            choice_id: { in: existingChoiceIds }
                        }
                    });

                    // xoá choices
                    await tx.question_choice.deleteMany({
                        where: {
                            id: { in: existingChoiceIds }
                        }
                    });
                }

                return await tx.question.findUnique({
                    where: { id: questionId },
                    include: {
                        question_choice: true
                    }
                });
            }

            // CASE 2: TRẮC NGHIỆM
            const existingById = new Map(existingChoices.map(c => [c.id, c]));
            const providedIds = new Set();

            for (let i = 0; i < choices.length; i++) {
                const c = choices[i];
                const order = c.order ?? i;

                if (c.id) {
                    if (!existingById.has(c.id)) {
                        const err = new Error(`Invalid choice id: ${c.id}`);
                        err.status = 400;
                        throw err;
                    }

                    providedIds.add(c.id);

                    await tx.question_choice.update({
                        where: { id: c.id },
                        data: {
                            label: c.label ?? null,
                            order,
                            text: c.text ?? "",
                            is_correct: !!c.is_correct,
                        }
                    });

                } else {
                    await tx.question_choice.create({
                        data: {
                            question_id: questionId,
                            label: c.label ?? null,
                            order,
                            text: c.text ?? "",
                            is_correct: !!c.is_correct,
                        }
                    });
                }
            }

            // xoá choice không còn
            const idsToDelete = existingChoices
                .map(c => c.id)
                .filter(id => !providedIds.has(id));

            if (idsToDelete.length > 0) {
                await tx.answer.deleteMany({
                    where: {
                        choice_id: { in: idsToDelete }
                    }
                });

                await tx.question_choice.deleteMany({
                    where: { id: { in: idsToDelete } }
                });
            }

            // return result
            const result = await tx.question.findUnique({
                where: { id: questionId },
                include: {
                    question_choice: {
                        orderBy: { order: "asc" }
                    }
                }
            });

            return result;
        });
    },

    // Xóa câu hỏi 
    // async deleteQuestion(questionId) {
    //     return await prisma.$transaction(async (tx) => {
            
    //         await tx.question_choice.deleteMany({
    //             where: { question_id: questionId }
    //         });

    //         await tx.question.delete({
    //             where: { id: questionId }
    //         });

    //         return;
    //     });
    // },
    
    //xóa câu hỏi - dat (soft delete)
    async deleteQuestion(questionId, teacherId) {
        return await prisma.$transaction(async (tx) => {

            // 1. Check quyền sở hữu 
            const question = await tx.question.findFirst({
                where: {
                    id: questionId,
                    owner_id: teacherId,
                    is_deleted: false
                }
            });

            if (!question) {
                throw new Error("Không tìm thấy câu hỏi hoặc không có quyền xóa");
            }

            // 2. Soft delete câu hỏi
            await tx.question.update({
                where: { id: questionId },
                data: {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: teacherId
                }
            });

            return true;
        });
    },

    // Khôi phục câu hỏi
    async restoreQuestion(questionId, teacherId) {
        const question = await prisma.question.findFirst({
            where: {
                id: questionId,
                owner_id: teacherId,
                is_deleted: true
            }
        });

        if (!question) {
            throw new Error("Không tìm thấy câu hỏi đã xóa hoặc không có quyền khôi phục");
        }

        await prisma.question.update({
            where: { id: questionId },
            data: {
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            }
        });

        return true;
    },

    // lấy chi tiết câu hỏi theo ID
    async getQuestionById(questionId, teacherId) {
        const question = await prisma.question.findFirst({
            where: { id: questionId, owner_id: teacherId, is_deleted: false },
            include: {
                question_choice: {
                    orderBy: { order: "asc" }
                    
                }
            }
        });
        return question;
    },

    // Tạo template đề thi
    async createExamTemplate(templateData, class_id, actorId) {
        const { questions = [], ...templateFields } = templateData;
        return await prisma.$transaction(async (tx) => {
            // Kiểm tra lớp học tồn tại và quyền của giáo viên
            const classInfo = await tx.Renamedclass.findFirst({
                where: { id: class_id }
            }); 
            console.log("classInfo in createExamTemplate:", classInfo);
            if (!classInfo) {
                const err = new Error("Lớp học không tồn tại");
                err.status = 404;
                throw err;
            }
            // Tạo template câu hỏi
            const createData = {
                title: templateFields.title?.trim() ,
                description: templateFields.description ?? null,
                Renamedclass: { connect: { id: class_id } },
                duration_seconds: templateFields.duration_seconds || null,
                shuffle_questions: templateFields.shuffle_questions || false,
                passing_score: templateFields.passing_score || null,
                user: { connect: { id: actorId } }
            };
            const newTemplate = await tx.exam_template.create({
                data: createData,
            });
        });
    },
    // Sửa template câu hỏi
    async updateExamTemplate(templateId, updateData) {
        return await prisma.$transaction(async (tx) => {
            // Lấy template hiện tại
            const existing = await tx.exam_template.findFirst({
                where: { id: templateId }
            });
            if (!existing) {
                const err = new Error("Template không tồn tại");
                err.status = 404;
                throw err;
            }
            // Chuẩn bị dữ liệu cập nhật
            const tUpdate = {};
            if (updateData.title !== undefined) tUpdate.title = updateData.title?.trim();
            if (updateData.description !== undefined) tUpdate.description = updateData.description ?? null;
            if (updateData.duration_seconds !== undefined) tUpdate.duration_seconds = updateData.duration_seconds || null;
            if (updateData.shuffle_questions !== undefined) tUpdate.shuffle_questions = updateData.shuffle_questions || false;
            if (updateData.passing_score !== undefined) tUpdate.passing_score = updateData.passing_score || null;
            // Cập nhật template
            const updatedTemplate = await tx.exam_template.update({
                where: { id: templateId },
                data: tUpdate,
            });
            return updatedTemplate;
                });
    },
    // Xóa template câu hỏi
    async deleteExamTemplate(templateId, actorId) {
        return await prisma.$transaction(async (tx) => {
            // Kiểm tra quyền sở hữu template
            const existing = await tx.exam_template.findFirst({
                where: { id: templateId, is_deleted: false}
            });
            if (!existing) {
                const err = new Error("Vui lòng nhập mã chính xác");
                err.status = 400;
                throw err;
            }
            if (existing.created_by !== actorId) {
                const err = new Error("Không có quyền xóa template này");
                err.status = 403;
                throw err;
            }
            // Soft delete template
            await tx.exam_template.update({
                where: { id: templateId },
                data: {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: actorId
                }
            });
            return { message: "Exam template archived successfully" };
        });
    },

    // Khôi phục exam template
    async restoreExamTemplate(templateId, actorId) {
        const existing = await prisma.exam_template.findFirst({
            where: { id: templateId, is_deleted: true, created_by: actorId }
        });

        if (!existing) {
            throw new Error("Không tìm thấy template đã xóa hoặc không có quyền khôi phục");
        }

        await prisma.exam_template.update({
            where: { id: templateId },
            data: {
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            }
        });

        return { message: "Exam template restored successfully" };
    },
    // Lấy danh sách template đề thi theo giáo viên
    async getExamTemplate(teacherId, options = {}) {
        if (!teacherId) {
            const err = new Error("Vui lòng nhập mã giáo viên");
            err.status = 400;
            throw err;
        }
        
        const { includeDeleted = false } = options;
        const where = { created_by: teacherId };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const templates = await prisma.exam_template.findMany({
            where,
            include: {
                Renamedclass: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        is_deleted: true
                    }
                }
            },
            orderBy: { created_at: "desc" }
        });
        return templates;
    },
    // lấy template đề thi theo keyword
    async searchExamTemplates(teacherId, keyword, options = {}) {
        if (!keyword || keyword.trim() === "") {
            return [];
        }
        
        const { includeDeleted = false } = options;
        const where = {
            created_by: teacherId,
            title: {
                contains: keyword,
                mode: "insensitive"
            }
        };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const templates = await prisma.exam_template.findMany({
            where,
            include: {
                Renamedclass: {
                    select: {
                        id: true,
                        name: true,
                        is_deleted: true
                    }
                }
            },
            orderBy: { created_at: "desc" }
        });
        return templates;
    },  
    // lấy template theo id 
    async getExamTemplateById(teacherId, templateId, options = {}){
        const { includeDeleted = false } = options;
        const where = { id: templateId, created_by: teacherId };
        
        if (!includeDeleted) {
            where.is_deleted = false;
        }
        
        const template = await prisma.exam_template.findFirst({
            where,
            include: {
                Renamedclass: {
                    select: {
                        id: true,
                        name: true,
                        is_deleted: true
                    }
                }
            }
        });
        if(!template){
            const err = new Error("Template đề thi không tồn tại hoặc không có quyền truy cập");
            err.status = 400;
            throw err;
        }
        return template;
    },

    // Đọc template cấu trúc 
    // async getExamTemplateById(templateId, actorId) {
    //     const template = await prisma.exam_template.findFirst({

    // const createData = {
    //             title: templateFields.title?.trim() ,
    //             description: templateFields.description ?? null,
    //             Renamedclass: { connect: { id: class_id } },
    //             duration_seconds: templateFields.duration_seconds || null,
    //             shuffle_questions: templateFields.shuffle_questions || false,
    //             passing_score: templateFields.passing_score || null,
    //             user: { connect: { id: actorId } }
    //         };

    //tạo instance đề thi
    async addExam_instance(instanceData, teacher_id) {
        const { questions = [], ... instanceFields} = instanceData;

        const allowedModes = ["ALL_OR_NOTHING", "PARTIAL_WITH_PENALTY"];
        if (
            instanceFields.scoring_mode &&
            !allowedModes.includes(instanceFields.scoring_mode)
        ) {
            throw new Error("Kiểu chấm điểm không hợp lệ");
        }

        return await prisma.$transaction(async (tx) => {
            const createData = {
                starts_at: new Date(instanceFields.starts_at),
                ends_at: new Date(instanceFields.ends_at),
                template_id: instanceFields.templateId,
                // exam_template: {connect: { id: instanceFields.templateId } },
                show_answers: instanceFields.show_answers ?? false,
                published: instanceFields.published ?? false,
                scoring_mode: instanceFields.scoring_mode ?? "ALL_OR_NOTHING",
                created_by: teacher_id,
                created_at: new Date()
            }
            const newExamInstance = await tx.exam_instance.create({
                data: createData,
            });
            
            console.log("newExamInstance:", newExamInstance);

            if (Array.isArray(questions) && questions.length > 0) {
                const mapped = questions.map((q, i) => ({
                    exam_instance_id: newExamInstance.id,
                    question_id: q.question_id,
                    ordinal: q.ordinal ?? i,
                    points: q.points,
                }));
                await tx.exam_question.createMany({
                    data: mapped,
                    skipDuplicates: true,
                });
            }

            const result = await tx.exam_instance.findUnique({
                where: { id: newExamInstance.id },
                include: {
                    exam_question: {
                        orderBy: { ordinal: "asc" }
                    }
                }
            });
            return result;
        });
    },

    // xóa instance đề thi
    async deleteExam_instance(instanceId, teacherId) {
        return await prisma.$transaction(async (tx) => {
            // Kiểm tra quyền sở hữu 
            const instance = await tx.exam_instance.findFirst({
                where: {
                    id: instanceId,
                    created_by: teacherId,
                    is_deleted: false
                }
            });
            if (!instance) {
                throw new Error("Không tìm thấy instance đề thi hoặc không có quyền xóa");
            }
            // Soft delete instance đề thi
            await tx.exam_instance.update({
                where: { id: instanceId },
                data: {
                    is_deleted: true,
                    deleted_at: new Date(),
                    deleted_by: teacherId
                }
            });
            return true;
        });
    },

    // Khôi phục exam instance
    async restoreExamInstance(instanceId, teacherId) {
        const instance = await prisma.exam_instance.findFirst({
            where: {
                id: instanceId,
                created_by: teacherId,
                is_deleted: true
            }
        });

        if (!instance) {
            throw new Error("Không tìm thấy instance đã xóa hoặc không có quyền khôi phục");
        }

        await prisma.exam_instance.update({
            where: { id: instanceId },
            data: {
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            }
        });

        return true;
    },

    // Lấy danh sách instance đề thi theo template  
    async getExamInstancesByTemplate(templateId, teacherId) {  
        const template = await prisma.exam_template.findFirst({
            where: { id: templateId, created_by: teacherId },
        });
        if (!template) {
            const err = new Error("Template đề thi không tồn tại hoăc không có quyền truy cập");
            err.status = 404;
            throw err;
        }
        const instances = await prisma.exam_instance.findMany({
            where: { template_id: templateId, is_deleted: false },
            orderBy: { created_at: "desc" }
        });
        return instances;
    },

    // chinh sua instance de thi
    async updateExamInstance(instanceId, teacher_id, updateData) {

        if (
            updateData.scoring_mode &&
            !["ALL_OR_NOTHING", "PARTIAL_WITH_PENALTY"].includes(updateData.scoring_mode)
        ) {
            const err = new Error("Kiểu chấm điểm không hợp lệ");
            err.status = 400;
            throw err;
        }
        
        return await prisma.$transaction(async (tx) => {
            // Lấy instance hiện tại và kiểm tra quyền
            const instance = await tx.exam_instance.findFirst({
                where: { id: instanceId, created_by: teacher_id },
            });
            if (!instance) {
                const err = new Error("Instance đề thi không tồn tại hoặc không có quyền sửa");
                err.status = 404;
                throw err;
            }

            // kiểm tra dữ liệu thời gian trước khi cập nhập
            if (updateData.starts_at && updateData.ends_at) {
                const startDate = new Date(updateData.starts_at);
                const endDate = new Date(updateData.ends_at);
                if (startDate >= endDate) {
                    const err = new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
                    err.status = 400;
                    throw err;
                }
            }
            else if (updateData.starts_at) {
                const startDate = new Date(updateData.starts_at);
                const endDate = instance.ends_at;   
                if (startDate >= endDate) {
                    const err = new Error("Thời gian bắt đầu mới phải trước thời gian kết thúc cũ");
                    err.status = 400;
                    throw err;
                }
                if (startDate <= new Date()) {
                    const err = new Error("Thời gian bắt đầu phải là tương lai");
                    err.status = 400;
                    throw err;
                }
            }
            else if (updateData.ends_at) {
                const startDate = instance.starts_at;
                const endDate = new Date(updateData.ends_at);
                if (startDate >= endDate) {
                    const err = new Error("Thời gian kết thúc mới phải sau thời gian bắt đầu cũ");
                    err.status = 400;
                    throw err;
                }
            }

            // Chuẩn bị dữ liệu cập nhật
            const iUpdate = {};
            if (updateData.starts_at !== undefined) iUpdate.starts_at = new Date(updateData.starts_at);
            if (updateData.ends_at !== undefined) iUpdate.ends_at = new Date(updateData.ends_at);
            if (updateData.published !== undefined) iUpdate.published = updateData.published;
            if (updateData.show_answers !== undefined) iUpdate.show_answers = updateData.show_answers;
            if (updateData.scoring_mode !== undefined) iUpdate.scoring_mode = updateData.scoring_mode;
            // Cập nhật instance
            const updatedInstance = await tx.exam_instance.update({
                where: { id: instanceId },
                data: iUpdate,
            });

            // xóa hết câu hỏi cũ
            await tx.exam_question.deleteMany({
                where: { exam_instance_id: instanceId }
            });
            // thêm câu hỏi mới
            const { questions = [] } = updateData;
            if (Array.isArray(questions) && questions.length > 0) {
                const mapped = questions.map((q, i) => ({
                    exam_instance_id: instanceId,
                    question_id: q.question_id,
                    ordinal: q.ordinal ?? i,
                    points: q.points,
                }));
                await tx.exam_question.createMany({
                    data: mapped,
                    skipDuplicates: true,
                });
            }

            const result = await tx.exam_instance.findUnique({
                where: { id: updatedInstance.id },
                include: {
                    exam_question: {
                        orderBy: { ordinal: "asc" }
                    }
                }
            });
            return result;
        });
    },

    // lấy chi tiết instance đề thi theo ID
    async getExamInstanceById(instanceId, teacherId) {
        const instance = await prisma.exam_instance.findFirst({
            where: { id: instanceId, created_by: teacherId },
            include: {
                exam_question: {
                    orderBy: { ordinal: "asc" }
                }
            }
        });
        return instance;
    },

    // tìm kiếm sinh viên theo tên hoặc email trong lớp học
    async searchStudentsInClass(teacherId, classId, keyword) {
        if (!keyword || keyword.trim() === "") {
            return [];
        }

        const students = await prisma.enrollment_request.findMany({
            where: {
                class_id: classId,
                status: "approved",
                Renamedclass: {
                    teacher_id: teacherId
                },
                user_enrollment_request_student_idTouser: {
                    name: {
                        contains: keyword,
                        mode: "insensitive"
                    }
                }
            },
            select: {
                user_enrollment_request_student_idTouser: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        return students.map(s => s.user_enrollment_request_student_idTouser);
    },

    // công bố đề thi
    async publishExamInstance(instanceId, teacherId) {
        const updatedInstance = await prisma.exam_instance.updateMany({
            where: { id: instanceId, created_by: teacherId },
            data: { published: true },
        });
        return updatedInstance;
    },

    // hủy công bố đề thi
    async unpublishExamInstance(instanceId, teacherId) {
        const updatedInstance = await prisma.exam_instance.updateMany({
            where: { id: instanceId, created_by: teacherId },
            data: { published: false },
        });
        return updatedInstance;
    },

    // Danh sách flag của học sinh trong 1 kỳ thi
    async listFlaggedSessionsByClass(exam_instance_id) {
        const flags = await prisma.session_flag.findMany({
            where: {
                exam_session: {
                    exam_instance_id: exam_instance_id,
                },
            },
            include: {
                exam_session: {
                    select: {
                        id: true,
                        user: { select: { id: true, name: true, email: true } },
                        exam_instance: {
                            select: {
                                id: true,
                                exam_template: {
                                    select: { id: true, title: true, class_id: true },
                                },
                            },
                        },
                    },
                },
                user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { created_at: "desc" },
        });

        return flags.map((f) => ({
            id: f.id,
            flag_type: f.flag_type,
            details: f.details,
            created_at: f.created_at,
            session_id: f.exam_session?.id,
            exam_instance_id: f.exam_session?.exam_instance?.id,
            exam_template: f.exam_session?.exam_instance?.exam_template,
            student: f.exam_session?.user,
            flagged_by: f.user,
        }));
    },

    // Khóa thủ công một phiên thi
    async lockExamSession(sessionId, teacherId, reason) {
        const session = await prisma.exam_session.findFirst({
            where: {
                id: sessionId,
                exam_instance: {
                    exam_template: {
                        Renamedclass: { teacher_id: teacherId },
                    },
                },
            },
            include: {
                exam_instance: { select: { id: true, ends_at: true } },
            },
        });

        if (!session) {
            const err = new Error("Phiên thi không tồn tại hoặc không thuộc lớp của bạn");
            err.status = 404;
            throw err;
        }

        if (session.state === "submitted" || session.state === "expired") {
            const err = new Error("Không thể khóa phiên đã nộp hoặc đã hết hạn");
            err.status = 400;
            throw err;
        }

        await prisma.exam_session.update({
            where: { id: sessionId },
            data: { state: "locked", updated_at: new Date() },
        });

        await prisma.session_flag.create({
            data: {
                exam_session_id: sessionId,
                flag_type: "manual_lock",
                details: { reason: reason || "Giáo viên khóa thủ công" },
                flagged_by: teacherId,
            },
        });

        return { sessionId, state: "locked" };
    },

    // Mở khóa thủ công một phiên thi
    async unlockExamSession(sessionId, teacherId, reason) {
        const session = await prisma.exam_session.findFirst({
            where: {
                id: sessionId,
                exam_instance: {
                    exam_template: {
                        Renamedclass: { teacher_id: teacherId },
                    },
                },
            },
            include: {
                exam_instance: { select: { ends_at: true } },
            },
        });

        if (!session) {
            const err = new Error("Phiên thi không tồn tại hoặc không thuộc lớp của bạn");
            err.status = 404;
            throw err;
        }

        if (session.state !== "locked") {
            const err = new Error("Chỉ mở khóa được phiên đang ở trạng thái locked");
            err.status = 400;
            throw err;
        }

        const now = new Date();
        if (session.exam_instance?.ends_at && now > session.exam_instance.ends_at) {
            const err = new Error("Phiên thi đã hết hạn, không thể mở khóa");
            err.status = 400;
            throw err;
        }

        await prisma.exam_session.update({
            where: { id: sessionId },
            data: { state: "started", updated_at: new Date() },
        });

        await prisma.session_flag.create({
            data: {
                exam_session_id: sessionId,
                flag_type: "manual_unlock",
                details: { reason: reason || "Giáo viên mở khóa thủ công" },
                flagged_by: teacherId,
            },
        });

        return { sessionId, state: "started" };
    },

    // Thêm thời gian cộng thêm cho một học sinh trong đề thi
    async upsertAccommodation({ teacherId, examInstanceId, studentId, extraSeconds, addSeconds, notes }) {
        // 1) Kiểm tra quyền sở hữu đề thi
        const instance = await prisma.exam_instance.findFirst({
            where: { id: examInstanceId, created_by: teacherId },
            include: { exam_template: true },
        });
        if (!instance) {
            const err = new Error("Đề thi không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        // 2) Kiểm tra học sinh thuộc lớp (và đã được duyệt)
        const enrollment = await prisma.enrollment_request.findFirst({
            where: {
                student_id: studentId,
                class_id: instance.exam_template.class_id,
                status: "approved",
            },
        });
        if (!enrollment) {
            const err = new Error("Học sinh không thuộc lớp của đề thi hoặc chưa được duyệt");
            err.status = 400;
            throw err;
        }

        // 3) Tính tổng thời gian cộng thêm: hỗ trợ chế độ cộng dồn (addSeconds) hoặc đặt tuyệt đối (extraSeconds)
        const existingAcc = await prisma.accommodation.findFirst({
            where: { user_id: studentId, exam_instance_id: examInstanceId },
        });
        const currentExtra = existingAcc?.extra_seconds || 0;
        const finalExtra = (typeof addSeconds === "number")
            ? currentExtra + addSeconds
            : (typeof extraSeconds === "number" ? extraSeconds : currentExtra);

        const accommodation = await prisma.accommodation.upsert({
            where: {
                user_id_exam_instance_id: {
                    user_id: studentId,
                    exam_instance_id: examInstanceId,
                },
            },
            update: {
                extra_seconds: finalExtra,
                notes: notes ?? existingAcc?.notes ?? null,
            },
            create: {
                user_id: studentId,
                exam_instance_id: examInstanceId,
                extra_seconds: finalExtra,
                notes: notes ?? null,
            },
        });

        // 4) Nếu học sinh đã có phiên thi đang diễn ra, kéo dài thời gian (không vượt quá ends_at của đề thi)
        const session = await prisma.exam_session.findFirst({
            where: {
                exam_instance_id: examInstanceId,
                user_id: studentId,
                state: "started",
            },
        });

        if (session && session.started_at) {
            const baseDuration = instance.exam_template.duration_seconds;
            const newDuration = baseDuration + accommodation.extra_seconds;
            const hardEnd = new Date(instance.ends_at);
            const softEnd = new Date(new Date(session.started_at).getTime() + newDuration * 1000);
            const newEndsAt = new Date(Math.min(hardEnd.getTime(), softEnd.getTime()));
            console.log({ hardEnd, softEnd, newEndsAt });
            if (!session.ends_at || newEndsAt > session.ends_at) {
                await prisma.exam_session.update({
                    where: { id: session.id },
                    data: { ends_at: newEndsAt },
                });
                
                // Trả về thông tin để broadcast WebSocket update
                return { accommodation, needsBroadcast: true, examInstanceId, studentId };
            }
        }

        return { accommodation, needsBroadcast: false };
    },

    // Liệt kê học sinh đang thi (có exam_session state='started') trong một lớp
    async listActiveStudentsInClass(teacherId, classId) {
        // 1) Kiểm tra lớp thuộc giáo viên (cho phép xem cả lớp đã xóa)
        const klass = await prisma.Renamedclass.findFirst({
            where: { id: classId, teacher_id: teacherId },
            select: { id: true, is_deleted: true }
        });
        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        // 2) Tìm các phiên thi đang diễn ra thuộc các exam_instance của lớp này
        const sessions = await prisma.exam_session.findMany({
            where: {
                state: "started",
                exam_instance: {
                    exam_template: {
                        class_id: classId,
                    },
                },
            },
            select: {
                user: { select: { id: true, name: true } },
                user_id: true,
            },
        });

        // 3) Unique theo user_id và trả về danh sách id/name
        const seen = new Set();
        const result = [];
        for (const s of sessions) {
            if (!seen.has(s.user_id)) {
                seen.add(s.user_id);
                result.push({ id: s.user.id, name: s.user.name });
            }
        }
        return result;
    },

    // Lấy tất cả exam_instance của 1 lớp học
    async getExamInstancesByClass(teacherId, classId) {
        // 1) Kiểm tra quyền lớp học
        const klass = await prisma.Renamedclass.findFirst({
            where: {
                id: classId,
                teacher_id: teacherId,
                is_deleted: false
            },
            select: { id: true }
        });

        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        // 2) Lấy exam_instance thông qua exam_template (không tính đã xóa)
        const instances = await prisma.exam_instance.findMany({
            where: {
                is_deleted: false,
                exam_template: {
                    class_id: classId,
                    is_deleted: false
                }
            },
            orderBy: {
                created_at: "desc"
            }
        });

        return instances;
    },

    // Lấy tiến độ làm bài thi của sinh viên trong lớp
    async getExamProgressByClass(teacherId, classId, examInstanceId) {

        // 1️ Check quyền giáo viên (cho phép xem cả lớp đã xóa)
        const klass = await prisma.Renamedclass.findFirst({
            where: {
                id: classId,
                teacher_id: teacherId
            },
            select: { id: true, is_deleted: true }
        });

        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        // 2️ Lấy sinh viên đã được duyệt
        const enrollments = await prisma.enrollment_request.findMany({
            where: {
                class_id: classId,
                status: "approved"
            },
            select: {
                user_enrollment_request_student_idTouser: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        const students = enrollments
            .map(e => e.user_enrollment_request_student_idTouser)
            .filter(Boolean); // loại null / undefined

        // 3️ Lấy session của ca thi
        const sessions = await prisma.exam_session.findMany({
            where: {
                exam_instance_id: examInstanceId
            },
            select: {
                id: true,
                user_id: true,
                state: true,
                started_at: true,
                ends_at: true
            }
        });


        // 4️ Map session theo user_id
        const sessionMap = new Map();
        for (const s of sessions) {
            sessionMap.set(s.user_id, s);
        }

        // 5️ Phân loại tiến độ
        const result = {
            not_started: [],
            in_progress: [],
            finished: [],
            locked: [] // Thêm category cho sessions bị khóa
        };

        const now = new Date();

        for (const user of students) {
            const session = sessionMap.get(user.id);

            // 5.1 Chưa vào phòng thi
            if (!session || session.state === "pending") {
                result.not_started.push(user);
                continue;
            }

            // 5.2 Bị khóa bởi giáo viên
            if (session.state === "locked") {
                result.locked.push({
                    ...user,
                    state: session.state,
                    started_at: session.started_at,
                    ends_at: session.ends_at
                });
                continue;
            }

            // 5.3 Đang làm bài (started + còn thời gian)
            if (
                session.state === "started" &&
                (!session.ends_at || now <= session.ends_at)
            ) {
                result.in_progress.push({
                    ...user,
                    state: session.state,
                    started_at: session.started_at,
                    ends_at: session.ends_at
                });
                continue;
            }

            // 5.4 Đã kết thúc (submitted / expired / started nhưng hết giờ)
            result.finished.push({
                ...user,
                state: session.state,
                started_at: session.started_at,
                ends_at: session.ends_at
            });
        }

        return result;
    },

    // Lấy thông tin dashboard của giáo viên (số lớp, học sinh, đề thi, hoạt động)
    async getDashboardStats(teacherId) {
        //  Lấy số lớp học (không tính đã xóa mềm)
        const classCount = await prisma.Renamedclass.count({
            where: { teacher_id: teacherId, is_deleted: false }
        });

        //  Lấy tổng số học sinh từ các lớp của giáo viên (không tính lớp đã xóa)
        const totalStudents = await prisma.enrollment_request.count({
            where: {
                status: "approved",
                Renamedclass: { teacher_id: teacherId, is_deleted: false }
            }
        });

        //  Lấy số đề thi đã tạo (không tính đã xóa mềm)
        const examInstanceCount = await prisma.exam_instance.count({
            where: { created_by: teacherId, is_deleted: false }
        });

        // Lấy hoạt động gần đây (từ các action khác nhau)
        const [recentClasses, recentEnrollments, recentExams, recentQuestions, recentTemplates] = await Promise.all([
            // Lớp học được tạo (không tính đã xóa)
            prisma.Renamedclass.findMany({
                where: { teacher_id: teacherId, is_deleted: false },
                select: { id: true, name: true, created_at: true },
                orderBy: { created_at: "desc" },
                take: 10
            }),
            // Học sinh tham gia được duyệt (không tính lớp đã xóa)
            prisma.enrollment_request.findMany({
                where: {
                    Renamedclass: { teacher_id: teacherId, is_deleted: false },
                    status: "approved"
                },
                select: {
                    id: true,
                    requested_at: true,
                    user_enrollment_request_student_idTouser: {
                        select: { name: true }
                    },
                    Renamedclass: { select: { name: true } }
                },
                orderBy: { requested_at: "desc" },
                take: 10
            }),
            // Đề thi được tạo (không tính đã xóa)
            prisma.exam_instance.findMany({
                where: { created_by: teacherId, is_deleted: false },
                select: {
                    id: true,
                    created_at: true,
                    exam_template: { select: { title: true } }
                },
                orderBy: { created_at: "desc" },
                take: 10
            }),
            // Câu hỏi được tạo (không tính đã xóa)
            prisma.question.findMany({
                where: { owner_id: teacherId, is_deleted: false },
                select: {
                    id: true,
                    text: true,
                    created_at: true
                },
                orderBy: { created_at: "desc" },
                take: 10
            }),
            // Template được tạo (không tính đã xóa)
            prisma.exam_template.findMany({
                where: { created_by: teacherId, is_deleted: false },
                select: {
                    id: true,
                    title: true,
                    created_at: true
                },
                orderBy: { created_at: "desc" },
                take: 10
            })
        ]);

        // Kết hợp tất cả hoạt động thành một danh sách duy nhất, sắp xếp theo thời gian
        const activities = [
            ...recentClasses.map(c => ({
                id: c.id,
                type: "create_class",
                description: `Tạo lớp học "${c.name}"`,
                timestamp: c.created_at
            })),
            ...recentEnrollments.map(e => ({
                id: e.id,
                type: "approve_enrollment",
                description: `Duyệt học sinh "${e.user_enrollment_request_student_idTouser.name}" vào lớp "${e.Renamedclass.name}"`,
                timestamp: e.updated_at
            })),
            ...recentExams.map(ex => ({
                id: ex.id,
                type: "create_exam_instance",
                description: `Tạo đề thi "${ex.exam_template.title}"`,
                timestamp: ex.created_at
            })),
            ...recentQuestions.map(q => ({
                id: q.id,
                type: "create_question",
                description: `Thêm câu hỏi: "${q.text.substring(0, 50)}..."`,
                timestamp: q.created_at
            })),
            ...recentTemplates.map(t => ({
                id: t.id,
                type: "create_template",
                description: `Tạo template đề thi "${t.title}"`,
                timestamp: t.created_at
            }))
        ];

        // Sắp xếp theo thời gian mới nhất
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Lấy 20 hoạt động gần nhất
        const recentActivities = activities.slice(0, 20);

        return {
            stats: {
                totalClasses: classCount,
                totalStudents,
                totalExams: examInstanceCount,
                totalQuestions: await prisma.question.count({ where: { owner_id: teacherId, is_deleted: false } }),
                totalTemplates: await prisma.exam_template.count({ where: { created_by: teacherId, is_deleted: false } })
            },
            recentActivities
        };
    },

    // // thông báo thông tin cho sinh viên
    // async notifyStudentsInClass(teacherId, classId, notificationData) {
    //     // 1) Kiểm tra quyền lớp học
    //     const klass = await prisma.Renamedclass.findFirst({
    //         where: {
    //             id: classId,
    //             teacher_id: teacherId
    //         },
    //         select: { id: true }
    //     });
    //     if (!klass) {
    //         const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
    //         err.status = 403;
    //         throw err;
    //     }
    //     // 2) Lấy danh sách học sinh đã được duyệt trong lớp
    //     const students = await prisma.enrollment_request.findMany({
    //         where: {
    //             class_id: classId,
    //             status: "approved"
    //         },
    //         select: {
    //             user_enrollment_request_student_idTouser: {
    //                 select: { id: true, name: true, email: true }
    //             }
    //         }
    //     });
    //     // 3) Gửi thông báo (giả sử có hàm sendNotification)
    //     const notifications = [];
    //     for (const s of students) {
    //         const user = s.user_enrollment_request_student_idTouser;
    //         const notification = await sendNotification(user.id, notificationData);
    //         notifications.push(notification);
    //     }
    //     return notifications;
    // }

    /**
     * Xuất danh sách học sinh trong lớp học ra CSV
     * @param {string} classId - ID lớp học
     * @param {string} teacherId - ID giáo viên (để kiểm tra quyền)
     * @returns {Promise<String>} CSV string
     */
    async exportStudentList(classId, teacherId) {
        // Kiểm tra quyền sở hữu lớp học
        const classInfo = await prisma.Renamedclass.findFirst({
            where: { 
                id: classId,
                teacher_id: teacherId,
                is_deleted: false
            }
        });

        if (!classInfo) {
            const err = new Error("Không tìm thấy lớp học hoặc bạn không có quyền truy cập");
            err.status = 404;
            throw err;
        }

        // Lấy danh sách học sinh
        const enrollments = await prisma.enrollment_request.findMany({
            where: {
                class_id: classId,
                status: 'approved'
            },
            orderBy: {
                requested_at: 'asc'
            },
            select: {
                requested_at: true,
                user_enrollment_request_student_idTouser: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        is_active: true,
                        created_at: true,
                        last_login_at: true
                    }
                }
            }
        });

        // Tạo CSV header
        let csv = 'ID,Email,Họ tên,Trạng thái,Ngày tham gia lớp,Ngày tạo tài khoản,Đăng nhập gần nhất\n';

        // Thêm dữ liệu
        enrollments.forEach(enrollment => {
            const student = enrollment.user_enrollment_request_student_idTouser;
            csv += `"${student.id}","${student.email}","${student.name}","${student.is_active ? 'Hoạt động' : 'Bị khóa'}","${enrollment.requested_at.toISOString()}","${student.created_at.toISOString()}","${student.last_login_at ? student.last_login_at.toISOString() : 'Chưa đăng nhập'}"\n`;
        });

        return csv;
    },

    /**
     * Xuất kết quả thi ra CSV
     * @param {string} examInstanceId - ID kỳ thi
     * @param {string} teacherId - ID giáo viên (để kiểm tra quyền)
     * @returns {Promise<String>} CSV string
     */
    async exportExamResults(examInstanceId, teacherId) {
        const exam = await prisma.exam_instance.findUnique({
            where: { id: examInstanceId },
            select: {
                id: true,
                starts_at: true,
                ends_at: true,
                exam_template: {
                    select: {
                        title: true,
                        duration_seconds: true,
                        passing_score: true,
                        Renamedclass: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                teacher_id: true
                            }
                        }
                    }
                },
                exam_session: {
                    select: {
                        id: true,
                        state: true,
                        started_at: true,
                        ends_at: true,
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true
                            }
                        },
                        submission: {
                            select: {
                                score: true,
                                max_score: true,
                                graded_at: true,
                                created_at: true
                            }
                        }
                    },
                    orderBy: {
                        created_at: 'desc'
                    }
                }
            }
        });

        if (!exam) {
            const err = new Error("Không tìm thấy kỳ thi");
            err.status = 404;
            throw err;
        }

        // Kiểm tra quyền
        if (exam.exam_template.Renamedclass.teacher_id !== teacherId) {
            const err = new Error("Bạn không có quyền truy cập kỳ thi này");
            err.status = 403;
            throw err;
        }

        // Tạo CSV header
        let csv = 'ID,Email,Họ tên,Trạng thái,Điểm,Điểm tối đa,Phần trăm,Kết quả,Thời gian bắt đầu,Thời gian nộp bài,Thời gian chấm\n';

        // Thêm dữ liệu
        exam.exam_session.forEach(session => {
            const submission = session.submission[0];
            const score = submission?.score || 0;
            const maxScore = submission?.max_score || 0;
            const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0;
            const passingScore = exam.exam_template.passing_score || 0;
            const passed = percentage >= passingScore ? 'Đạt' : 'Không đạt';

            csv += `"${session.user.id}","${session.user.email}","${session.user.name}","${session.state}","${score}","${maxScore}","${percentage}%","${passed}","${session.started_at ? session.started_at.toISOString() : 'Chưa bắt đầu'}","${submission?.created_at ? submission.created_at.toISOString() : 'Chưa nộp'}","${submission?.graded_at ? submission.graded_at.toISOString() : 'Chưa chấm'}"\n`;
        });

        return csv;
    },

    /**
     * Xuất nhật ký thi ra CSV
     * @param {string} examInstanceId - ID kỳ thi
     * @param {string} teacherId - ID giáo viên (để kiểm tra quyền)
     * @returns {Promise<String>} CSV string
     */
    async exportExamLogs(examInstanceId, teacherId) {
        // Kiểm tra quyền
        const exam = await prisma.exam_instance.findUnique({
            where: { id: examInstanceId },
            select: {
                exam_template: {
                    select: {
                        Renamedclass: {
                            select: {
                                teacher_id: true
                            }
                        }
                    }
                }
            }
        });

        if (!exam) {
            const err = new Error("Không tìm thấy kỳ thi");
            err.status = 404;
            throw err;
        }

        if (exam.exam_template.Renamedclass.teacher_id !== teacherId) {
            const err = new Error("Bạn không có quyền truy cập kỳ thi này");
            err.status = 403;
            throw err;
        }

        const logs = await prisma.audit_log.findMany({
            where: {
                exam_session: {
                    exam_instance_id: examInstanceId
                }
            },
            orderBy: {
                created_at: 'asc'
            },
            select: {
                id: true,
                event_type: true,
                created_at: true,
                source_ip: true,
                user_agent: true,
                payload: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                exam_session: {
                    select: {
                        id: true,
                        token: true
                    }
                }
            }
        });

        // Tạo CSV header
        let csv = 'Thời gian,Loại sự kiện,Người dùng,Email,Session ID,IP,User Agent,Chi tiết\n';

        // Thêm dữ liệu
        logs.forEach(log => {
            const details = log.payload ? JSON.stringify(log.payload).replace(/"/g, '""') : '';
            const userAgent = (log.user_agent || '').replace(/"/g, '""');

            csv += `"${log.created_at.toISOString()}","${log.event_type}","${log.user?.name || 'N/A'}","${log.user?.email || 'N/A'}","${log.exam_session?.id || 'N/A'}","${log.source_ip || 'N/A'}","${userAgent}","${details}"\n`;
        });

        return csv;
    },

    // giáo viên lấy danh sách điểm của sinh viên trong lớp ở một kỳ thi
    async getStudentScoresInClass(teacherId, classId, examInstanceId) {
        // 1️ Check quyền lớp học
        const klass = await prisma.Renamedclass.findFirst({
            where: {
                id: classId,
                teacher_id: teacherId,
                is_deleted: false
            },
            select: { id: true },
        });

        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        // 2️ Lấy toàn bộ sinh viên trong lớp
        const enrollments = await prisma.enrollment_request.findMany({
            where: {
                class_id: classId,
                status: "approved",
            },
            select: {
                user_enrollment_request_student_idTouser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        const students = enrollments
            .map(e => e.user_enrollment_request_student_idTouser)
            .filter(Boolean);

        // 3️ Lấy toàn bộ session của kỳ thi
        const sessions = await prisma.exam_session.findMany({
            where: {
                exam_instance_id: examInstanceId,
            },
            include: {
                submission: {
                    select: {
                        score: true,
                        max_score: true,
                        graded_at: true,
                    },
                },
            },
        });

        // 4️ Map session theo user_id
        const sessionMap = new Map();
        sessions.forEach(s => {
            sessionMap.set(s.user_id, s);
        });

        // 5️ Chuẩn hóa bảng điểm
        const result = students.map(user => {
            const session = sessionMap.get(user.id);
            const submission = session?.submission?.[0];

            return {
                user_id: user.id,
                name: user.name,
                email: user.email,
                state: session?.state ?? "not_started",
                score: submission ? Number(submission.score) : 0,
                max_score: submission ? Number(submission.max_score) : 0,
                graded_at: submission?.graded_at ?? null,
            };
        });

        return result;
    },


    // lấy danh sách template đề thi theo lớp học
    async getExamTemplatesByClass(teacherId, classId, options = {}) {
        const { includeDeleted = false } = options;
        
        // Kiểm tra quyền truy cập lớp (cho phép xem cả lớp đã xóa)
        const classWhere = {
            id: classId,
            teacher_id: teacherId
        };
        
        const klass = await prisma.Renamedclass.findFirst({
            where: classWhere,
            select: { id: true, is_deleted: true, name: true }
        });
        
        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền");
            err.status = 403;
            throw err;
        }

        const templateWhere = { class_id: classId };
        if (!includeDeleted) {
            templateWhere.is_deleted = false;
        }
        
        const templates = await prisma.exam_template.findMany({
            where: templateWhere,
            orderBy: { created_at: "desc" }
        });
        return templates;
    },
    async removeStudentFromClass(teacherId, classId, studentId){
        // Kiểm tra quyền sở hữu lớp học
        const klass = await prisma.Renamedclass.findFirst({
            where: { 
                id: classId,
                teacher_id: teacherId,
                is_deleted: false
            }
        });
        if (!klass) {
            const err = new Error("Lớp học không tồn tại hoặc bạn không có quyền truy cập");
            err.status = 400;
            throw err;
        }
        // Xóa yêu cầu tham gia lớp học của học sinh
        const deleted = await prisma.enrollment_request.deleteMany({
            where: {
                class_id: classId,
                student_id: studentId,
                status: 'approved'
            }
        });
        return deleted;
    }

};

