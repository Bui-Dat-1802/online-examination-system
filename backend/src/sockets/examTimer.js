const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const JWT_SECRET = process.env.JWT_SECRET || "Password123!!!";

/**
 * Tự động nộp bài và tính điểm khi hết thời gian
 */
async function autoSubmitExamOnTimeout(sessionId, studentId) {
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

  if (!session || session.user_id !== studentId) {
    throw new Error("Phiên làm bài không hợp lệ");
  }

  if (session.state === "submitted") {
    const existing = await prisma.submission.findFirst({
      where: { exam_session_id: sessionId }
    });

    return existing;
  }

  // Lấy tất cả đáp án đã chọn
  const answers = await prisma.answer.findMany({
    where: { exam_session_id: sessionId },
    select: {
      question_id: true,
      choice_id: true,
      selected_choice_ids: true,
      text_answer: true
    },
  });

  const answerMap = new Map(
    answers.map((a) => [
      a.question_id,
      {
        choice_ids:
          (a.selected_choice_ids && a.selected_choice_ids.length > 0)
            ? a.selected_choice_ids
            : (a.choice_id ? [a.choice_id] : []),
        text_answer: a.text_answer || ""
      }
    ])
  );

  // Tính điểm
  let totalScore = 0;
  let maxScore = 0;
  const details = [];

  for (const eq of session.exam_instance.exam_question) {
    const points = Number(eq.points);
    maxScore += points;

    const answerData = answerMap.get(eq.question_id) || {
      choice_ids: [],
      text_answer: ""
    };

    const chosenChoiceIds = answerData.choice_ids;
    const textAnswer = answerData.text_answer;

    let correct = false;
    let earnedPoints = 0;

    // =========================
    // CÂU ĐIỀN
    // =========================
    if (eq.question.type === "FILL_IN_THE_BLANK") {
      const correctText = (eq.question.correct_text_answer || "").trim().toLowerCase();
      const studentText = (textAnswer || "").trim().toLowerCase();

      if (correctText && studentText && correctText === studentText) {
        correct = true;
        earnedPoints = points;
      }
    }

    // =========================
    // CÂU TRẮC NGHIỆM
    // =========================
    else {
      const correctChoices = eq.question.question_choice
        .filter(c => c.is_correct)
        .map(c => c.id);

      const scoringMode = session.exam_instance.scoring_mode || "ALL_OR_NOTHING";

      if (scoringMode === "ALL_OR_NOTHING") {
        if (
          chosenChoiceIds.length === correctChoices.length &&
          chosenChoiceIds.length > 0
        ) {
          const chosenSet = new Set(chosenChoiceIds);
          const allMatch = correctChoices.every(id => chosenSet.has(id));

          if (allMatch) {
            correct = true;
            earnedPoints = points;
          }
        }
      }

      if (scoringMode === "PARTIAL_WITH_PENALTY") {
        const correctSet = new Set(correctChoices);
        const totalCorrect = correctChoices.length;

        let numCorrectChosen = 0;
        let numWrongChosen = 0;

        for (const id of chosenChoiceIds) {
          if (correctSet.has(id)) numCorrectChosen++;
          else numWrongChosen++;
        }

        if (totalCorrect > 0) {
          earnedPoints =
            ((numCorrectChosen - numWrongChosen) / totalCorrect) * points;

          if (earnedPoints < 0) earnedPoints = 0;
          if (earnedPoints > points) earnedPoints = points;
        }

        correct = earnedPoints === points;
      }
    }

    totalScore += earnedPoints;

    details.push({
      question_id: eq.question_id,
      correct,
      points_earned: Number(earnedPoints.toFixed(2)),
      points_possible: Number(points.toFixed(2)),
      selected_choice_ids: chosenChoiceIds,
      correct_choice_ids:
        eq.question.type === "FILL_IN_THE_BLANK"
          ? []
          : eq.question.question_choice
              .filter(c => c.is_correct)
              .map(c => c.id),
      correct_text_answer:
        eq.question.type === "FILL_IN_THE_BLANK"
          ? (eq.question.correct_text_answer || "")
          : null,
      student_text_answer:
        eq.question.type === "FILL_IN_THE_BLANK"
          ? textAnswer
          : null
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
      score: Number(totalScore.toFixed(2)),
      max_score: Number(maxScore.toFixed(2)),
      graded_at: new Date(),
      graded_by: null, // auto-graded
      details: details,
    },
  });

  // Log audit
  await prisma.audit_log.create({
    data: {
      event_type: "EXAM_AUTO_SUBMIT",
      exam_session_id: sessionId,
      user_id: studentId,
      payload: `Tự động nộp bài do hết thời gian - Phiên ${sessionId}`,
      source_ip: null,
      user_agent: null,
    },
  });

  return {
    submission_id: submission.id,
    score: submission.score,
    max_score: submission.max_score,
    graded_at: submission.graded_at,
    details: session.exam_instance.show_answers ? submission.details : undefined,
  };
}

/**
 * Xác thực socket bằng JWT token
 */
function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return next(new Error("Không có token xác thực"));
    }

    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.id;
    socket.userRole = payload.role;
    next();
  } catch (err) {
    next(new Error("Token không hợp lệ"));
  }
}

/**
 * Tính thời gian còn lại của exam session (tính bằng giây)
 */
function calculateRemainingTime(examSession) {
  if (!examSession.started_at || !examSession.ends_at) {
    return null;
  }

  const now = new Date();
  const endsAt = new Date(examSession.ends_at);
  const remainingMs = endsAt.getTime() - now.getTime();
  
  // Trả về số giây còn lại, tối thiểu là 0
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Lấy thông tin exam session của học sinh
 */
async function getExamSession(userId, examInstanceId) {
  try {
    console.log(`[getExamSession] userId: ${userId}, examInstanceId: ${examInstanceId}`);
    
    // Kiểm tra xem có exam session nào không
    const anySession = await prisma.exam_session.findFirst({
      where: {
        user_id: userId,
        exam_instance_id: examInstanceId,
      },
      select: {
        id: true,
        state: true
      }
    });

    console.log(`[getExamSession] anySession:`, anySession);

  if (!anySession) {
    // Kiểm tra xem exam_instance có tồn tại và học sinh có quyền tham gia không
    const examInstance = await prisma.exam_instance.findUnique({
      where: { id: examInstanceId },
      include: {
        exam_template: {
          include: {
            Renamedclass: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!examInstance) {
      return { error: "EXAM_NOT_FOUND", message: "Kỳ thi không tồn tại" };
    }

    // Kiểm tra enrollment
    const enrollment = await prisma.enrollment_request.findFirst({
      where: {
        student_id: userId,
        class_id: examInstance.exam_template.Renamedclass.id,
        status: "approved"
      }
    });

    if (!enrollment) {
      return { error: "NOT_ENROLLED", message: "Bạn chưa tham gia lớp học này" };
    }

    // Trả về trạng thái chờ - chưa bắt đầu làm bài
    return { 
      error: "NOT_STARTED", 
      message: "Bạn chưa bắt đầu làm bài thi này. Vui lòng nhấn 'Bắt đầu làm bài' để tiếp tục.",
      canStart: true
    };
  }

  if (!["started", "pending"].includes(anySession.state)) {
    return { 
      error: "INVALID_STATE", 
      message: `Phiên thi đang ở trạng thái: ${anySession.state}`,
      currentState: anySession.state
    };
  }

  const examSession = await prisma.exam_session.findFirst({
    where: {
      user_id: userId,
      exam_instance_id: examInstanceId,
      state: { in: ["started", "pending"] }
    },
    include: {
      exam_instance: {
        select: {
          template_id: true,
          starts_at: true,
          ends_at: true,
        }
      }
    }
  });

  console.log(`[getExamSession] Final examSession:`, examSession);
  return examSession;
  } catch (error) {
    console.error(`[getExamSession] Error:`, error);
    console.error(`[getExamSession] Error stack:`, error.stack);
    throw error;
  }
}

/**
 * Lấy thông tin tất cả exam sessions đang hoạt động của học sinh
 */
async function getActiveExamSessions(userId) {
  const examSessions = await prisma.exam_session.findMany({
    where: {
      user_id: userId,
      state: { in: ["started"] }
    },
    include: {
      exam_instance: {
        select: {
          id: true,
          template_id: true,
          starts_at: true,
          ends_at: true,
        }
      }
    }
  });

  return examSessions;
}

/**
 * Khởi tạo WebSocket cho exam timer
 */
function initExamTimerSocket(io) {
  const examNamespace = io.of("/exam-timer");
  
  // Map để theo dõi intervals của từng socket
  const timerIntervals = new Map();

  examNamespace.use(authenticateSocket);

  examNamespace.on("connection", (socket) => {
    console.log(`[ExamTimer] User ${socket.userId} connected`);

    // Lắng nghe sự kiện subscribe đến một exam cụ thể
    socket.on("subscribe", async ({ examInstanceId }) => {
      try {
        console.log(`[ExamTimer] Subscribe request - User: ${socket.userId}, Exam: ${examInstanceId}`);
        
        const examSession = await getExamSession(socket.userId, examInstanceId);
        
        console.log(`[ExamTimer] getExamSession result:`, JSON.stringify(examSession, null, 2));
        
        // Kiểm tra lỗi chi tiết
        if (!examSession || examSession.error) {
          const errorInfo = examSession || {};
          console.log(`[ExamTimer] Subscribe failed - ${errorInfo.error || 'NO_SESSION'}: ${errorInfo.message || 'Không tìm thấy phiên thi'}`);
          
          // Nếu là trường hợp chưa bắt đầu làm bài (NOT_STARTED), cho phép subscribe
          if (errorInfo.error === "NOT_STARTED") {
            const roomName = `exam-${examInstanceId}`;
            socket.join(roomName);
            
            socket.emit("waiting", {
              code: "NOT_STARTED",
              message: errorInfo.message,
              examInstanceId: examInstanceId,
              canStart: true
            });
            
            console.log(`[ExamTimer] User ${socket.userId} subscribed to ${roomName} (waiting to start)`);
            return;
          }
          
          // Các lỗi khác
          socket.emit("error", { 
            code: errorInfo.error || "NO_SESSION",
            message: errorInfo.message || "Không tìm thấy phiên thi hoặc phiên thi đã kết thúc",
            currentState: errorInfo.currentState
          });
          return;
        }

        // Join room theo examInstanceId
        const roomName = `exam-${examInstanceId}`;
        socket.join(roomName);

        console.log(`[ExamTimer] User ${socket.userId} subscribed to ${roomName}`);

        // Gửi thời gian còn lại ngay lập tức
        const remainingTime = calculateRemainingTime(examSession);
        socket.emit("time-update", {
          examInstanceId,
          examSessionId: examSession.id,
          remainingSeconds: remainingTime,
          state: examSession.state,
          started_at: examSession.started_at,
          ends_at: examSession.ends_at
        });

        // Nếu chưa có interval cho socket này, tạo mới
        if (!timerIntervals.has(socket.id)) {
          const intervalId = setInterval(async () => {
            try {
              // Lấy lại thông tin exam session để đảm bảo dữ liệu mới nhất
              const updatedSession = await getExamSession(socket.userId, examInstanceId);
              
              if (!updatedSession || updatedSession.state === "submitted") {
                // Nếu session không còn hoặc đã submit, dừng timer
                socket.emit("exam-ended", {
                  examInstanceId,
                  examSessionId: updatedSession?.id,
                  state: updatedSession?.state
                });
                
                clearInterval(intervalId);
                timerIntervals.delete(socket.id);
                return;
              }

              const remainingTime = calculateRemainingTime(updatedSession);
              
              socket.emit("time-update", {
                examInstanceId,
                examSessionId: updatedSession.id,
                remainingSeconds: remainingTime,
                state: updatedSession.state,
                started_at: updatedSession.started_at,
                ends_at: updatedSession.ends_at
              });

              // Nếu hết thời gian, tự động submit và thông báo
              if (remainingTime === 0) {
                try {
                  // Gọi logic tự động chấm điểm giống như nộp thủ công
                  const result = await autoSubmitExamOnTimeout(updatedSession.id, socket.userId);
                  
                  socket.emit("time-expired", {
                    examInstanceId,
                    examSessionId: updatedSession.id,
                    message: "Thời gian làm bài đã hết, bài thi được tự động nộp",
                    submission: result
                  });
                } catch (error) {
                  console.error(`[ExamTimer] Auto-submit failed:`, error);
                  // Fallback: chỉ cập nhật state
                  await prisma.exam_session.update({
                    where: { id: updatedSession.id },
                    data: { state: "submitted" }
                  });
                  
                  socket.emit("time-expired", {
                    examInstanceId,
                    examSessionId: updatedSession.id,
                    message: "Thời gian làm bài đã hết, bài thi được tự động nộp"
                  });
                }
                
                clearInterval(intervalId);
                timerIntervals.delete(socket.id);
              }
            } catch (error) {
              console.error(`[ExamTimer] Error in interval for socket ${socket.id}:`, error);
            }
          }, 1000); // Cập nhật mỗi giây

          timerIntervals.set(socket.id, intervalId);
        }
      } catch (error) {
        console.error("[ExamTimer] Subscribe error:", error);
        console.error("[ExamTimer] Error stack:", error.stack);
        socket.emit("error", { message: "Lỗi khi đăng ký nhận thời gian thi", details: error.message });
      }
    });

    // Lắng nghe sự kiện unsubscribe
    socket.on("unsubscribe", ({ examInstanceId }) => {
      const roomName = `exam-${examInstanceId}`;
      socket.leave(roomName);
      
      // Dừng interval khi unsubscribe
      if (timerIntervals.has(socket.id)) {
        clearInterval(timerIntervals.get(socket.id));
        timerIntervals.delete(socket.id);
      }
      
      console.log(`[ExamTimer] User ${socket.userId} unsubscribed from ${roomName}`);
    });

    // Lấy thời gian còn lại theo yêu cầu (on-demand)
    socket.on("get-remaining-time", async ({ examInstanceId }) => {
      try {
        console.log(`[ExamTimer] Get remaining time - User: ${socket.userId}, Exam: ${examInstanceId}`);
        
        const examSession = await getExamSession(socket.userId, examInstanceId);
        
        if (!examSession || examSession.error) {
          socket.emit("error", { 
            code: examSession?.error || "NO_SESSION",
            message: examSession?.message || "Không tìm thấy phiên thi"
          });
          return;
        }

        const remainingTime = calculateRemainingTime(examSession);
        
        socket.emit("remaining-time", {
          examInstanceId,
          examSessionId: examSession.id,
          remainingSeconds: remainingTime,
          state: examSession.state,
          started_at: examSession.started_at,
          ends_at: examSession.ends_at
        });
      } catch (error) {
        console.error("[ExamTimer] Get remaining time error:", error);
        socket.emit("error", { message: "Lỗi khi lấy thời gian còn lại" });
      }
    });

    // Lấy danh sách tất cả exam sessions đang active
    socket.on("get-active-sessions", async () => {
      try {
        const sessions = await getActiveExamSessions(socket.userId);
        const sessionsWithTime = sessions.map(session => ({
          examInstanceId: session.exam_instance_id,
          examSessionId: session.id,
          remainingSeconds: calculateRemainingTime(session),
          state: session.state,
          started_at: session.started_at,
          ends_at: session.ends_at
        }));

        socket.emit("active-sessions", { sessions: sessionsWithTime });
      } catch (error) {
        console.error("[ExamTimer] Get active sessions error:", error);
        socket.emit("error", { message: "Lỗi khi lấy danh sách phiên thi" });
      }
    });

    // Heartbeat để kiểm tra kết nối
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // Pause timer (nếu cần tạm dừng nhận cập nhật)
    socket.on("pause-timer", () => {
      if (timerIntervals.has(socket.id)) {
        clearInterval(timerIntervals.get(socket.id));
        timerIntervals.delete(socket.id);
        console.log(`[ExamTimer] Timer paused for socket ${socket.id}`);
      }
    });

    // Resume timer (tiếp tục nhận cập nhật)
    socket.on("resume-timer", async ({ examInstanceId }) => {
      try {
        // Nếu đã có interval thì không tạo mới
        if (timerIntervals.has(socket.id)) {
          return;
        }

        const examSession = await getExamSession(socket.userId, examInstanceId);
        
        if (!examSession || examSession.error) {
          socket.emit("error", { 
            code: examSession?.error || "NO_SESSION",
            message: examSession?.message || "Không tìm thấy phiên thi"
          });
          return;
        }

        // Tạo interval mới
        const intervalId = setInterval(async () => {
          try {
            const updatedSession = await getExamSession(socket.userId, examInstanceId);
            
            if (!updatedSession || updatedSession.state === "submitted") {
              socket.emit("exam-ended", {
                examInstanceId,
                examSessionId: updatedSession?.id,
                state: updatedSession?.state
              });
              
              clearInterval(intervalId);
              timerIntervals.delete(socket.id);
              return;
            }

            const remainingTime = calculateRemainingTime(updatedSession);
            
            socket.emit("time-update", {
              examInstanceId,
              examSessionId: updatedSession.id,
              remainingSeconds: remainingTime,
              state: updatedSession.state,
              started_at: updatedSession.started_at,
              ends_at: updatedSession.ends_at
            });

            if (remainingTime === 0) {
              socket.emit("time-expired", {
                examInstanceId,
                examSessionId: updatedSession.id
              });
              
              clearInterval(intervalId);
              timerIntervals.delete(socket.id);
            }
          } catch (error) {
            console.error(`[ExamTimer] Error in resumed interval for socket ${socket.id}:`, error);
          }
        }, 1000);

        timerIntervals.set(socket.id, intervalId);
        console.log(`[ExamTimer] Timer resumed for socket ${socket.id}`);
      } catch (error) {
        console.error("[ExamTimer] Resume timer error:", error);
        socket.emit("error", { message: "Lỗi khi tiếp tục timer" });
      }
    });

    // Xử lý khi socket disconnect
    socket.on("disconnect", () => {
      console.log(`[ExamTimer] User ${socket.userId} disconnected`);
      
      // Xóa interval nếu có
      if (timerIntervals.has(socket.id)) {
        clearInterval(timerIntervals.get(socket.id));
        timerIntervals.delete(socket.id);
      }
    });
  });

  return examNamespace;
}

/**
 * Broadcast cập nhật thời gian cho một exam instance cụ thể
 * Sử dụng khi giáo viên cập nhật thời gian exam
 */
async function broadcastTimeUpdate(io, examInstanceId, userId = null) {
  const examNamespace = io.of("/exam-timer");
  const roomName = `exam-${examInstanceId}`;
  
  console.log(`[ExamTimer] Broadcasting time update for exam ${examInstanceId}`);
  
  // Nếu có userId cụ thể, chỉ cập nhật cho user đó
  if (userId) {
    const examSession = await getExamSession(userId, examInstanceId);
    
    if (examSession && !examSession.error) {
      const remainingTime = calculateRemainingTime(examSession);
      
      // Emit cho tất cả sockets của user này trong room
      examNamespace.to(roomName).emit("time-force-update", {
        examInstanceId,
        examSessionId: examSession.id,
        remainingSeconds: remainingTime,
        state: examSession.state,
        started_at: examSession.started_at,
        ends_at: examSession.ends_at,
        message: "Giáo viên đã cập nhật thời gian làm bài"
      });
    }
  } else {
    // Broadcast cho tất cả users trong room
    examNamespace.to(roomName).emit("time-force-update", {
      examInstanceId,
      message: "Thời gian thi đã được cập nhật, vui lòng làm mới"
    });
  }
}

module.exports = { initExamTimerSocket, broadcastTimeUpdate };
