const prisma = require("../prisma");
const crypto = require("crypto");

async function createSessionFlagOnce({ sessionId, flagType, details = null, flaggedBy = null }) {
  const existing = await prisma.session_flag.findFirst({
    where: {
      exam_session_id: sessionId,
      flag_type: flagType,
    },
    select: { id: true },
  });

  if (existing) return existing;

  return prisma.session_flag.create({
    data: {
      exam_session_id: sessionId,
      flag_type: flagType,
      details,
      flagged_by: flaggedBy,
    },
  });
}

function normalizeClientIp(value) {
  if (!value) return null;

  let ip = String(value).trim();

  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  if (ip === "::1") {
    return "127.0.0.1";
  }

  return ip || null;
}

function getClientIp(req) {
  return normalizeClientIp(
    req.headers["x-client-ip"] ||
      req.headers["x-original-client-ip"] ||
      req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"] ||
      req.ip ||
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress
  );
}

// Middleware: validate X-Exam-Token for session routes.
module.exports = async function examSessionMiddleware(req, res, next) {
  try {
    const token = req.headers["x-exam-token"];
    const sessionId = req.params.id;

    if (!token) {
      const err = new Error("Thieu token phien lam bai (X-Exam-Token)");
      err.status = 401;
      throw err;
    }

    let session = await prisma.exam_session.findUnique({ where: { id: sessionId } });
    if (!session) {
      const err = new Error("Phien lam bai khong ton tai");
      err.status = 404;
      throw err;
    }

    if (session.token !== token) {
      const err = new Error("Token phien lam bai khong hop le");
      err.status = 401;
      throw err;
    }

    if (req.user?.id !== session.user_id) {
      const err = new Error("Ban khong co quyen truy cap phien nay");
      err.status = 403;
      throw err;
    }

    const now = new Date();
    if (session.state !== "started") {
      const err = new Error("Phien lam bai khong o trang thai dang dien ra");
      err.status = session.state === "locked" ? 423 : 400;
      err.locked = session.state === "locked";
      throw err;
    }

    if (session.ends_at && now > session.ends_at) {
      await prisma.exam_session.update({
        where: { id: sessionId },
        data: { state: "submitted" },
      });
      const err = new Error("Phien lam bai da het han va duoc tu dong nop");
      err.status = 400;
      throw err;
    }

    const reqIp = getClientIp(req);
    const reqUA = req.headers["user-agent"] || "";
    const reqUAHash = crypto.createHash("sha256").update(reqUA).digest("hex");

    const rebindData = {};
    if (!session.ip_binding && reqIp) {
      rebindData.ip_binding = reqIp;
    }
    if (!session.ua_hash && reqUA) {
      rebindData.ua_hash = reqUAHash;
    }

    if (Object.keys(rebindData).length > 0) {
      session = await prisma.exam_session.update({
        where: { id: sessionId },
        data: { ...rebindData, updated_at: new Date() },
      });

      await prisma.audit_log.create({
        data: {
          event_type: "SESSION_REBIND",
          exam_session_id: sessionId,
          user_id: req.user.id,
          payload: "Session IP/User-Agent binding refreshed",
          source_ip: reqIp,
          user_agent: reqUA,
        },
      });
    }

    if (reqIp && session.ip_binding && session.ip_binding !== reqIp) {
      await createSessionFlagOnce({
        sessionId,
        flagType: "multi_ip",
        details: { expected: session.ip_binding, actual: reqIp },
        flaggedBy: null,
      });
      await prisma.audit_log.create({
        data: {
          event_type: "IP_CHANGE",
          exam_session_id: sessionId,
          user_id: req.user.id,
          payload: `IP changed from ${session.ip_binding} to ${reqIp}`,
          source_ip: reqIp,
          user_agent: reqUA,
        },
      });

      if (process.env.EXAM_LOCK_ON_IP_CHANGE === "true") {
        await prisma.exam_session.update({
          where: { id: sessionId },
          data: { state: "locked", updated_at: new Date() },
        });
        const err = new Error("Phien thi da bi khoa do thay doi IP");
        err.status = 423;
        err.locked = true;
        throw err;
      }
    }

    if (session.ua_hash && session.ua_hash !== reqUAHash) {
      await createSessionFlagOnce({
        sessionId,
        flagType: "ua_mismatch",
        details: "Phat hien User-Agent khong khop",
        flaggedBy: null,
      });
      await prisma.audit_log.create({
        data: {
          event_type: "BROWSER_CHANGE",
          exam_session_id: sessionId,
          user_id: req.user.id,
          payload: "Browser changed during exam",
          source_ip: reqIp,
          user_agent: reqUA,
        },
      });

      if (process.env.EXAM_LOCK_ON_UA_CHANGE === "true") {
        await prisma.exam_session.update({
          where: { id: sessionId },
          data: { state: "locked", updated_at: new Date() },
        });
        const err = new Error("Phien thi da bi khoa do thay doi trinh duyet");
        err.status = 423;
        err.locked = true;
        throw err;
      }
    }

    req.examSession = session;
    next();
  } catch (error) {
    next(error);
  }
};
