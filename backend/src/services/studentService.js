const prisma = require("../prisma");
const userService = require("../services/userService");

module.exports = {
    // Tham gia lớp học
    async joinClass(studentId, classCode, note) {
        const classInfo = await prisma.Renamedclass.findFirst({
            where: { code: classCode, is_deleted: false },
        });
        if (!classInfo) {
            throw new Error("Lớp học không tồn tại");
        }

        const existingRequest = await prisma.enrollment_request.findFirst({
            where: { student_id: studentId, class_id: classInfo.id },
        });
        if (existingRequest) {
            throw new Error("Bạn đã gửi yêu cầu tham gia lớp học này");
        }

        const newRequest = await prisma.enrollment_request.create({
            data: {
                student_id: studentId,
                class_id: classInfo.id,
                status: "pending",
                note: note || null,
            },
        });
        return newRequest;
    },

    // Lấy danh sách lớp học đã tham gia
    async getEnrolledClasses(studentId, status) {
        if (status !== "pending" && status !== "approved") {
            const err =  new Error("Trạng thái không hợp lệ");
            err.status = 400;
            throw err;
        }
        const enrollments = await prisma.enrollment_request.findMany({
            where: { 
                student_id: studentId, 
                status: status,
                Renamedclass: {
                    is_deleted: false
                }
            },
            include: { Renamedclass: true },
        });
        const classes = enrollments.map((enrollment) => enrollment.Renamedclass);
        return classes;
    },

    // Rời lớp học
    async leaveClass(studentId, classId) {
        await prisma.enrollment_request.deleteMany({
            where: { student_id: studentId, class_id: classId, status: "approved" },
        });
        return;
    },


    // lấy danh sách đề thi của sinh viên theo lớp học
    async getExamsByClass(studentId, classId) {
        const enrollments = await prisma.enrollment_request.findFirst({
            where: { student_id: studentId, class_id: classId, status: "approved" },
        });
        if (!enrollments) {
            throw new Error("Sinh viên không tham gia lớp học này");
        }   
        const exams = await prisma.exam_instance.findMany({
            where: { 
                is_deleted: false,
                published: true,
                exam_template: {
                    class_id: classId,
                    is_deleted: false
                },
            },
            select: {
                id: true,
                starts_at: true,
                ends_at: true,
                exam_template: {
                    select: {
                        title: true,
                        duration_seconds: true,
                        passing_score: true,
                    },
                },
            },
        });

        const now = new Date();
        const examsWithStatus = exams.map(exam => {
            let status;

            if (now < exam.starts_at) {
                status = "upcoming";
            } else if (now > exam.ends_at) {
                status = "ended";
            } else {
                status = "ongoing";
            }

            return {
                id: exam.id,
                title: exam.exam_template.title,
                starts_at: exam.starts_at,
                ends_at: exam.ends_at,
                duration: exam.exam_template.duration_seconds,
                passing_score: exam.exam_template.passing_score,
                status,
            };
        });
        
        return examsWithStatus;
    },

    // Bắt đầu kỳ thi: tạo phiên làm bài (exam_session)
    async startExam(studentId, examInstanceId, clientMeta = {}) {
        const examInstance = await prisma.exam_instance.findUnique({
            where: { id: examInstanceId },
            include: {
                exam_template: true,
                exam_question: {
                    include: {
                        question: {
                            include: { question_choice: true },
                        },
                    },
                    orderBy: { ordinal: "asc" },
                },
            },
        });

        if (!examInstance) {
            const err = new Error("Đề thi không tồn tại");
            err.status = 404;
            throw err;
        }
        if (!examInstance.published) {
            const err = new Error("Đề thi chưa được công bố");
            err.status = 400;
            throw err;
        }

        const now = new Date();
        if (now < examInstance.starts_at || now > examInstance.ends_at) {
            const err = new Error("Đề thi không nằm trong khung thời gian cho phép");
            err.status = 400;
            throw err;
        }

        // Kiểm tra sinh viên thuộc lớp và đã được duyệt
        const approved = await prisma.enrollment_request.findFirst({
            where: {
                student_id: studentId,
                class_id: examInstance.exam_template.class_id,
                status: "approved",
            },
        });
        if (!approved) {
            const err = new Error("Sinh viên chưa được duyệt tham gia lớp chứa đề thi này");
            err.status = 403;
            throw err;
        }


        // Nếu đã có session trước đó
        const existingSession = await prisma.exam_session.findFirst({
            where: { exam_instance_id: examInstanceId, user_id: studentId },
        });
        if (existingSession) {
            if (existingSession.state === "started") {
                // Fetch và return questions cho existing session
                const existingQuestions = examInstance.exam_question.map((eq) => {
                    const correctCount = eq.question.question_choice.filter((c) => c.is_correct).length;
                    return {
                        id: eq.question.id,
                        text: eq.question.text,
                        explanation: null,
                        ordinal: eq.ordinal,
                        points: eq.points,
                        multichoice: correctCount > 1,
                        choices: eq.question.question_choice
                            .sort((a, b) => a.order - b.order)
                            .map((c) => ({ id: c.id, label: c.label, order: c.order, text: c.text })),
                        selected_choice_ids: [],
                    };
                });
                return {
                    session_id: existingSession.id,
                    token: existingSession.token,
                    started_at: existingSession.started_at,
                    ends_at: existingSession.ends_at,
                    state: existingSession.state,
                    duration_seconds: existingSession.ends_at ? Math.floor((existingSession.ends_at - existingSession.started_at) / 1000) : 0,
                    // questions: existingQuestions,
                };
            }
            const blockedStates = ["submitted", "expired", "locked"];
            if (blockedStates.includes(existingSession.state)) {
                const err = new Error("Phiên làm bài đã kết thúc hoặc bị khóa");
                err.status = 400;
                throw err;
            }
        }

        // Tính thời gian kết thúc phiên làm bài theo duration + accommodation
        const accom = await prisma.accommodation.findFirst({
            where: { user_id: studentId, exam_instance_id: examInstanceId },
        });
        const extraSeconds = accom?.extra_seconds || 0;
        const durationSeconds = examInstance.exam_template.duration_seconds + extraSeconds;
        const hardEnd = new Date(examInstance.ends_at);
        const softEnd = new Date(now.getTime() + durationSeconds * 1000);
        const sessionEndsAt = new Date(Math.min(hardEnd.getTime(), softEnd.getTime()));

        // Tạo token phiên
        const crypto = require("crypto");
        const token = crypto.randomBytes(32).toString("hex");

        // Ghi log thông tin trình duyệt/IP nếu có
        const uaHash = clientMeta.userAgent
            ? crypto.createHash("sha256").update(clientMeta.userAgent).digest("hex")
            : undefined;

        const created = await prisma.exam_session.create({
            data: {
                exam_instance_id: examInstanceId,
                user_id: studentId,
                token,
                state: "started",
                started_at: now,
                ends_at: sessionEndsAt,
                ip_binding: clientMeta.ip || null,
                ua_hash: uaHash || null,
            },
        });
        await prisma.audit_log.create({
            data: {
                event_type: "EXAM_START",
                exam_session_id: created.id,
                user_id: studentId,
                payload: `Học sinh bắt đầu làm bài thi ${examInstanceId}`,
                source_ip: clientMeta.ip || null,
                user_agent: clientMeta.userAgent || null,
            },
        });

        // Chuẩn bị danh sách câu hỏi (ẩn đáp án đúng)
        const questions = examInstance.exam_question.map((eq) => {
            const correctCount = eq.question.question_choice.filter((c) => c.is_correct).length;
            return {
                id: eq.question.id,
                text: eq.question.text,
                explanation: null, // không trả về giải thích của giáo viên
                ordinal: eq.ordinal,
                points: eq.points,
                multichoice: correctCount > 1,
                choices: eq.question.question_choice
                    .sort((a, b) => a.order - b.order)
                    .map((c) => ({ id: c.id, label: c.label, order: c.order, text: c.text })),
                selected_choice_ids: [],
            };
        });
        // console.log(questions);
        return {
            session_id: created.id,
            token: created.token,
            started_at: created.started_at,
            ends_at: created.ends_at,
            duration_seconds: durationSeconds,
            state: created.state,
            questions,
        };
    },

    // Lấy danh sách câu hỏi theo session
    async getSessionQuestions(sessionId, studentId) {
        const session = await prisma.exam_session.findUnique({
            where: { id: sessionId },
            include: {
                exam_instance: {
                    include: {
                        exam_template: true,
                        exam_question: {
                            include: {
                                question: { include: { question_choice: true } },
                            },
                            orderBy: { ordinal: "asc" },
                        },
                    },
                },
            },
        });
        if (!session) {
            const err = new Error("Phiên làm bài không tồn tại");
            err.status = 404;
            throw err;
        }
        if (session.user_id !== studentId) {
            const err = new Error("Bạn không có quyền truy cập phiên này");
            err.status = 403;
            throw err;
        }
        if (session.state !== "started") {
            const err = new Error("Phiên làm bài chưa bắt đầu hoặc đã kết thúc");
            err.status = 400;
            throw err;
        }
        const now = new Date();
        if (session.ends_at && now > session.ends_at) {
            // tự động chuyển sang expired
            await prisma.exam_session.update({
                where: { id: sessionId },
                data: { state: "expired" },
            });
            const err = new Error("Phiên làm bài đã hết hạn");
            err.status = 400;
            throw err;
        }

        // Lấy đáp án đã chọn để render lại khi resume
        const answers = await prisma.answer.findMany({
            where: { exam_session_id: sessionId },
            select: { question_id: true, choice_id: true, selected_choice_ids: true },
        });
        const answerMap = new Map(
            answers.map((a) => [a.question_id, (a.selected_choice_ids && a.selected_choice_ids.length > 0) ? a.selected_choice_ids : (a.choice_id ? [a.choice_id] : [])])
        );

        const questions = session.exam_instance.exam_question.map((eq) => {
            const correctCount = eq.question.question_choice.filter((c) => c.is_correct).length;
            return {
                id: eq.question.id,
                text: eq.question.text,
                explanation: null,
                ordinal: eq.ordinal,
                points: eq.points,
                multichoice: correctCount > 1,
                choices: eq.question.question_choice
                    .sort((a, b) => a.order - b.order)
                    .map((c) => ({ id: c.id, label: c.label, order: c.order, text: c.text })),
                selected_choice_ids: answerMap.get(eq.question.id) || [],
            };
        });
        return questions;
    },

    // Upsert đáp án cho một câu hỏi trong phiên
    async upsertAnswer(sessionId, studentId, questionId, choiceIds) {
        // Validate session and ownership/state
        const session = await prisma.exam_session.findUnique({ where: { id: sessionId } });
        if (!session) {
            const err = new Error("Phiên làm bài không tồn tại");
            err.status = 404;
            throw err;
        }


        if (session.user_id !== studentId) {
            const err = new Error("Bạn không có quyền truy cập phiên này");
            err.status = 403;
            throw err;
        }
        if (session.state !== "started") {
            const err = new Error("Phiên làm bài không ở trạng thái đang diễn ra");
            err.status = 400;
            throw err;
        }
        const now = new Date();
        if (session.ends_at && now > session.ends_at) {
            await prisma.exam_session.update({ where: { id: sessionId }, data: { state: "expired" } });
            const err = new Error("Phiên làm bài đã hết hạn");
            err.status = 400;
            throw err;
        }

        // Validate question belongs to this exam_instance
        const examQuestion = await prisma.exam_question.findFirst({
            where: { exam_instance_id: session.exam_instance_id, question_id: questionId },
        });
        if (!examQuestion) {
            const err = new Error("Câu hỏi không thuộc đề thi này");
            err.status = 400;
            throw err;
        }

        // Normalize và validate danh sách lựa chọn
        const ids = Array.isArray(choiceIds) ? choiceIds.filter(Boolean) : (choiceIds ? [choiceIds] : []);
        const uniqueIds = [...new Set(ids)];
        if (uniqueIds.length === 0) {
            const err = new Error("Thiếu danh sách lựa chọn (choice_ids)");
            err.status = 400;
            throw err;
        }
        const validChoices = await prisma.question_choice.findMany({
            where: { id: { in: uniqueIds }, question_id: questionId },
            select: { id: true },
        });
        if (validChoices.length !== uniqueIds.length) {
            const err = new Error("Có lựa chọn không thuộc câu hỏi này");
            err.status = 400;
            throw err;
        }

        const answered = await prisma.answer.upsert({
            where: {
                exam_session_id_question_id: {
                    exam_session_id: sessionId,
                    question_id: questionId,
                },
            },
            update: { choice_id: uniqueIds[0] || null, selected_choice_ids: uniqueIds, answered_at: now },
            create: {
                exam_session_id: sessionId,
                question_id: questionId,
                choice_id: uniqueIds[0] || null,
                selected_choice_ids: uniqueIds,
                answered_at: now,
            },
        });
        await prisma.audit_log.create({
            data: {
                event_type: "ANSWER_SUBMIT",
                exam_session_id: sessionId,
                user_id: studentId,
                payload: `Học sinh trả lời câu hỏi ${questionId} với lựa chọn ${JSON.stringify(uniqueIds)}`,
                source_ip: null,
                user_agent: null,
            },
        });

        return { question_id: answered.question_id, choice_ids: answered.selected_choice_ids };
    },

    // Heartbeat theo session: cập nhật trạng thái, đếm mất focus, lock nếu vượt ngưỡng
    async heartbeatSession(sessionId, studentId, payload = {}) {
        const session = await prisma.exam_session.findUnique({ where: { id: sessionId } });
        if (!session) {
            const err = new Error("Phiên làm bài không tồn tại");
            err.status = 404;
            throw err;
        }
        if (session.user_id !== studentId) {
            const err = new Error("Bạn không có quyền truy cập phiên này");
            err.status = 403;
            throw err;
        }
        if (session.state !== "started") {
            const err = new Error("Phiên làm bài không ở trạng thái đang diễn ra");
            err.status = 400;
            throw err;
        }

        const now = new Date();
        let updates = { last_heartbeat_at: now };

        // đếm mất focus
        const focusLost = !!payload.focusLost;
        const threshold = Number(process.env.EXAM_FOCUS_LOST_THRESHOLD || 100000);
        let locked = false;
        if (focusLost) {
            updates.focus_lost_count = session.focus_lost_count + 1;
            if (updates.focus_lost_count >= threshold) {
                updates.state = "locked";
                locked = true;
                await prisma.session_flag.create({
                    data: {
                        exam_session_id: sessionId,
                        flag_type: "focus_lost_threshold",
                        details: { count: updates.focus_lost_count, threshold },
                        flagged_by: null,
                    },
                });
            }
        }

        // audit log
        await prisma.audit_log.create({
            data: {
                event_type: "TAB_SWITCH",
                exam_session_id: sessionId,
                user_id: studentId,
                payload: "Người dùng đã chuyển tab hoặc mất focus cửa sổ lần thứ " + (focusLost ? updates.focus_lost_count : 0),
                source_ip: payload.ip || null,
                user_agent: payload.userAgent || null,
            },
        });

        const updated = await prisma.exam_session.update({
            where: { id: sessionId },
            data: updates,
        });

        return { state: updated.state, focus_lost_count: updated.focus_lost_count, locked };
    },

    // Nộp bài: chuyển state sang submitted, tính điểm tự động, tạo submission
    async submitExam(sessionId, studentId) {
        const session = await prisma.exam_session.findUnique({
            where: { id: sessionId },
            include: {
                exam_instance: {
                    include: {
                        exam_template: true,
                        exam_question: {
                            include: {
                                question: {
                                    include: { question_choice: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!session) {
            const err = new Error("Phiên làm bài không tồn tại");
            err.status = 404;
            throw err;
        }
        if (session.user_id !== studentId) {
            const err = new Error("Bạn không có quyền truy cập phiên này");
            err.status = 403;
            throw err;
        }
        if (session.state !== "started") {
            const err = new Error("Phiên làm bài không ở trạng thái đang diễn ra");
            err.status = 400;
            throw err;
        }

        // Lấy tất cả đáp án đã chọn
        const answers = await prisma.answer.findMany({
            where: { exam_session_id: sessionId },
            select: { question_id: true, choice_id: true, selected_choice_ids: true },
        });

        const answerMap = new Map(
            answers.map((a) => [
                a.question_id,
                (a.selected_choice_ids && a.selected_choice_ids.length > 0)
                    ? a.selected_choice_ids
                    : (a.choice_id ? [a.choice_id] : []),
            ])
        );

        // Tính điểm: duyệt từng câu hỏi trong exam_question
        let totalScore = 0;
        let maxScore = 0;
        const details = [];

        for (const eq of session.exam_instance.exam_question) {
            const points = Number(eq.points);
            maxScore += points;

            const chosenChoiceIds = answerMap.get(eq.question_id) || [];
            let correct = false;
            const correctChoices = eq.question.question_choice.filter((c) => c.is_correct).map((c) => c.id);
            if (chosenChoiceIds.length === correctChoices.length && chosenChoiceIds.length > 0) {
                const chosenSet = new Set(chosenChoiceIds);
                const correctSet = new Set(correctChoices);
                const allMatch = correctChoices.every((id) => chosenSet.has(id)) && chosenChoiceIds.every((id) => correctSet.has(id));
                if (allMatch) {
                    correct = true;
                    totalScore += points;
                }
            }

            details.push({
                question_id: eq.question_id,
                correct,
                points_earned: correct ? points : 0,
                points_possible: points,
            });
        }

        // Chuyển state sang submitted
        await prisma.exam_session.update({
            where: { id: sessionId },
            data: { state: "submitted" },
        });

        // Tạo submission
        const submission = await prisma.submission.create({
            data: {
                exam_session_id: sessionId,
                score: totalScore,
                max_score: maxScore,
                graded_at: new Date(),
                graded_by: null, // auto-graded
                details: details,
            },
        });
        await prisma.audit_log.create({
            data: {
                event_type: "EXAM_SUBMIT",
                exam_session_id: sessionId,
                user_id: studentId,
                payload: `Học sinh nộp bài thi cho phiên ${sessionId}`,
                source_ip: null,
                user_agent: null,
            },
        });

        // Kiểm tra cờ hiển thị đáp án
        const showAnswers = session.exam_instance.show_answers;

        const result = {
            submission_id: submission.id,
            score: submission.score,
            max_score: submission.max_score,
            graded_at: submission.graded_at,
        };

        // Chỉ trả details nếu giáo viên cho phép
        if (showAnswers) {
            result.details = submission.details;
        }

        return result;
    },

    // hủy yêu cầu tham gia lớp học
    async cancelEnrollmentRequest(studentId, classId) {
        await prisma.enrollment_request.deleteMany({
            where: { student_id: studentId, class_id: classId, status: "pending" }
        });
        return;
    },


    // lấy dashboard của sinh viên
    async getStudentDashboard(studentId) {

        // 1️ Kiểm tra sinh viên tồn tại
        const student = await userService.getUserById(studentId);
        if (!student) {
            const err = new Error("Sinh viên không tồn tại");
            err.status = 404;
            throw err;
        }

        // 2️ Lấy danh sách lớp đã tham gia (không bao gồm lớp đã xóa mềm)
        const classes = await prisma.enrollment_request.findMany({
            where: { 
                student_id: studentId, 
                status: "approved",
                Renamedclass: {
                    is_deleted: false
                }
            },
            include: { Renamedclass: true },
        });

        const classList = classes.map(e => e.Renamedclass).filter(Boolean);
        const classIds = classList.map(c => c.id);

        const now = new Date();

        // 3️ Lấy submission đã hoàn thành (không tính từ lớp/kỳ thi đã xóa mềm)
        const submissions = await prisma.submission.findMany({
            where: {
                exam_session: {
                    user_id: studentId,
                    exam_instance: {
                        is_deleted: false,
                        published: true,
                        exam_template: {
                            is_deleted: false,
                            Renamedclass: {
                                is_deleted: false
                            }
                        }
                    },
                },
                graded_at: { not: null },
            },
            select: {
                score: true,
                max_score: true,
            },
        });

        let avgScore = 0;
        if (submissions.length > 0) {
            const normalizedScores = submissions.map(s =>
                s.max_score > 0 ? (Number(s.score) / Number(s.max_score)) * 10 : 0
            );
            avgScore =
                normalizedScores.reduce((sum, v) => sum + v, 0) /
                normalizedScores.length;
        }
        avgScore = Number(avgScore.toFixed(2));

        // 4️⃣ Số kỳ thi sắp tới (không tính đã xóa)
        const upcomingCount = await prisma.exam_instance.count({
            where: {
                is_deleted: false,
                published: true,
                starts_at: { gt: now },
                exam_template: {
                    class_id: { in: classIds },
                    is_deleted: false
                },
            },
        });

        // 5️ Số kỳ thi đã hoàn thành (không tính từ lớp/kỳ thi đã xóa)
        const completedCount = await prisma.submission.count({
            where: {
                exam_session: {
                    user_id: studentId,
                    exam_instance: {
                        is_deleted: false,
                        published: true,
                        exam_template: {
                            is_deleted: false,
                            Renamedclass: {
                                is_deleted: false
                            }
                        }
                    },
                },
            },
        });

        // 6️⃣ bài thi đã mở nhưng chưa thi (không tính đã xóa)
        const notAttemptedExams = await prisma.exam_instance.findMany({
            where: {
                is_deleted: false,
                published: true,
                starts_at: { lte: now },
                ends_at: { gt: now },
                exam_template: {
                    class_id: {
                        in: classList.map(c => c.id),
                    },
                    is_deleted: false
                },
                exam_session: {
                    none: {
                        user_id: studentId,
                    },
                },
            },
            select: {
                id: true,
                starts_at: true,
                ends_at: true,
                exam_template: {
                    select: {
                        title: true,
                        duration_seconds: true,
                        class_id: true,
                    },
                },
            },
        });

        const notAttempted = notAttemptedExams.map(e => ({
            examInstanceId: e.id,
            title: e.exam_template.title,
            durationMinutes: Math.ceil(e.exam_template.duration_seconds / 60),
            starts_at: e.starts_at,
            ends_at: e.ends_at,
            class_id: e.exam_template.class_id,
        }));

        const notAttemptedCount = notAttempted.length;

        return {
            classes: classList,
            averageScore: avgScore,
            upcomingCount,
            completedCount,
            notAttemptedCount,
            notAttemptedExams: notAttempted,
        };

    }

};