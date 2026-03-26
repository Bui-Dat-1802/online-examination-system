const prisma = require("../prisma");
const crypto = require("crypto");

// Middleware: validate X-Exam-Token for session routes
module.exports = async function examSessionMiddleware(req, res, next) {
  try {
    const token = req.headers["x-exam-token"]; // session token
    const sessionId = req.params.id; // expects /sessions/:id/*

    if (!token) {
      const err = new Error("Thiếu token phiên làm bài (X-Exam-Token)");
      err.status = 401;
      throw err;
    }

    const session = await prisma.exam_session.findUnique({ where: { id: sessionId } });
    if (!session) {
      const err = new Error("Phiên làm bài không tồn tại");
      err.status = 404;
      throw err;
    }

    // match token
    if (session.token !== token) {
      const err = new Error("Token phiên làm bài không hợp lệ");
      err.status = 401;
      throw err;
    }

    // match user
    if (req.user?.id !== session.user_id) {
      const err = new Error("Bạn không có quyền truy cập phiên này");
      err.status = 403;
      throw err;
    }

    // state and time window
    const now = new Date();
    if (session.state !== "started") {
      const err = new Error("Phiên làm bài không ở trạng thái đang diễn ra");
      err.status = 400;
      throw err;
    }
    if (session.ends_at && now > session.ends_at) {
      await prisma.exam_session.update({ where: { id: sessionId }, data: { state: "submitted" } });
      const err = new Error("Phiên làm bài đã hết hạn và được tự động nộp");
      err.status = 400;
      throw err;
    }

    // Anti-cheat: record IP/UA mismatches as flags (allow continue)
    const reqIp = req.ip;
    const reqUA = req.headers["user-agent"] || "";
    const reqUAHash = crypto.createHash("sha256").update(reqUA).digest("hex");

    if (session.ip_binding && session.ip_binding !== reqIp) {
      await prisma.session_flag.create({
        data: {
          exam_session_id: sessionId,
          flag_type: "multi_ip",
          details: "Phát hiện IP không khớp {}".replace("{}", reqIp),
          flagged_by: null,
        },
      });
      await prisma.audit_log.create({
        data: {
          event_type: "IP_CHANGE",
          exam_session_id: sessionId,
          user_id: req.user.id,
          payload: `IP thay đổi từ ${session.ip_binding} sang ${reqIp}`,
          source_ip: reqIp,
          user_agent: reqUA,
        },
      });
    }
    if (session.ua_hash && session.ua_hash !== reqUAHash) {
      await prisma.session_flag.create({
        data: {
          exam_session_id: sessionId,
          flag_type: "ua_mismatch",
          details: "Phát hiện User-Agent không khớp",
          flagged_by: null,
        },
      });
      await prisma.audit_log.create({
        data: {
          event_type: "BROWSER_CHANGE",
          exam_session_id: sessionId,
          user_id: req.user.id,
          payload: `Trình duyệt làm bài thi đã thay đổi`,
          source_ip: reqIp,
          user_agent: reqUA,
        },
      });
    }

    // attach for downstream
    req.examSession = session;
    next();
  } catch (error) {
    next(error);
  }
}
