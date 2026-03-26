const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const userService = require("./userService");
const { hashPassword, comparePassword, hashOtp, compareOtp } = require("../utils/hash");
const { sendResetOtpEmail } = require("./emailService");
const crypto = require("crypto");
const { registerRequest } = require("../controllers/authController");

const JWT_SECRET = process.env.JWT_SECRET || "Password123!!!";

module.exports = {
  
  // async registerRequest(data) {
  //   const { email, password, name, role_id, role_name } = data;

  //   if (!email || !password || !name) {
  //     const err = new Error("Missing required fields: email, password, name");
  //     err.status = 400;
  //     throw err;
  //   }

  //   const existing = await userService.getUserByEmail(email);
  //   if (existing) {
  //     const err = new Error("Email already in use");
  //     err.status = 409;
  //     throw err;
  //   }

  //   // Resolve role_id: prefer explicit role_id, then role_name, then default role "student"
  //   let resolvedRoleId = null;

  //   if (role_id) {
  //     const r = await prisma.auth_role.findUnique({ where: { id: role_id } });
  //     if (!r) {
  //       const err = new Error("Role not found for provided role_id");
  //       err.status = 400;
  //       throw err;
  //     }
  //     resolvedRoleId = r.id;
  //   } else if (role_name) {
  //     const r = await prisma.auth_role.findUnique({ where: { name: role_name } });
  //     if (!r) {
  //       const err = new Error(`Role not found for provided role_name: ${role_name}`);
  //       err.status = 400;
  //       throw err;
  //     }
  //     resolvedRoleId = r.id;
  //   } else {
  //     // No role provided — use default "student" (create if missing)
  //     let defaultRole = await prisma.auth_role.findUnique({ where: { name: "student" } });
  //     if (!defaultRole) {
  //       defaultRole = await prisma.auth_role.create({ data: { name: "student" } });
  //     }
  //     resolvedRoleId = defaultRole.id;
  //   }

  //   const hashed = await hashPassword(password);

  //   const user = await userService.createUser({
  //     email,
  //     name,
  //     password_hash: hashed,
  //     role_id: resolvedRoleId,
  //   });

  //   return  {message: "User registered successfully"};
  // },

  async registerRequest(data) {
    const { email, password, name, role_id, role_name } = data;

    if (!email || !password || !name) {
      const err = new Error("Missing required fields");
      err.status = 400;
      throw err;
    }

    const existing = await userService.getUserByEmail(email);
    if (existing) {
      const err = new Error("Email already in use");
      err.status = 409;
      throw err;
    }

    // kiểm tra role
    let resolvedRoleId = null;
    if (role_id) {
      const r = await prisma.auth_role.findUnique({ where: { id: role_id } });
      if (!r) {
        const err = new Error("Role not found for provided role_id");
        err.status = 400;
        throw err;
      }
      resolvedRoleId = r.id;
    } else if (role_name) {
      const r = await prisma.auth_role.findUnique({ where: { name: role_name } });
      if (!r) {
        const err = new Error(`Role not found for provided role_name: ${role_name}`);
        err.status = 400;
        throw err;
      }
      resolvedRoleId = r.id;
    } else {
      // No role provided — use default "student" (create if missing)
      let defaultRole = await prisma.auth_role.findUnique({ where: { name: "student" } });
      if (!defaultRole) {
        defaultRole = await prisma.auth_role.create({ data: { name: "student" } });
      }
      resolvedRoleId = defaultRole.id;
    }

    // Tạo OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await hashOtp(otp);

    // Xoá OTP cũ (nếu có)
    await prisma.pending_user.deleteMany({
      where: { email }
    });

    const hashedPassword = await hashPassword(password);

    // Tạo bản ghi pending_user
    await prisma.pending_user.upsert({
      where: { email },
      update: {
        name,
        password_hash: hashedPassword,
        role_id: resolvedRoleId,
        otp_hash: otpHash,
        otp_expires_at: new Date(Date.now() + 5 * 60 * 1000),
        otp_used: false,
        otp_attempts: 0,
      },
      create: {
        email,
        name,
        password_hash: hashedPassword,
        role_id: resolvedRoleId,
        otp_hash: otpHash,
        otp_expires_at: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // Gửi email
    await sendResetOtpEmail(email, otp, "Xác thực đăng ký tài khoản");
      return {
        message: "OTP has been sent to your email",
    };

  },

  async registerConfirm(data) {
    const { email, otp } = data;

    // Validate input
    if (!email || !otp) {
      const err = new Error("Missing required fields: email, otp");
      err.status = 400;
      throw err;
    }

    // kiểm tra pending_user
    const pending = await prisma.pending_user.findUnique({
      where: { email },
    });

    if (!pending) {
      const err = new Error("Registration not found or expired");
      err.status = 400;
      throw err;
    }

    // Check OTP state
    if (pending.otp_used) {
      const err = new Error("OTP already used");
      err.status = 400;
      throw err;
    }

    if (pending.otp_expires_at < new Date()) {
      const err = new Error("OTP expired");
      err.status = 400;
      throw err;
    }

    // 4. Check attempt limit
    if (pending.otp_attempts >= 5) {
      const err = new Error("Too many invalid OTP attempts");
      err.status = 429;
      throw err;
    }

    // 5. Verify OTP
    const isValid = await compareOtp(otp, pending.otp_hash);

    if (!isValid) {
      await prisma.pending_user.update({
        where: { email },
        data: { otp_attempts: { increment: 1 } },
      });

      const err = new Error("OTP invalid");
      err.status = 400;
      throw err;
    }

    // 6. OTP hợp lệ → tạo user thật
    const user = await prisma.user.create({
      data: {
        email: pending.email,
        name: pending.name,
        password_hash: pending.password_hash,
        role_id: pending.role_id,
      },
    });

    // 7. Cleanup pending_user
    await prisma.pending_user.delete({
      where: { email },
    });

    // 8. Response
    return {
      message: "User registered successfully",
      user_id: user.id, 
    };
  },



  async login({ email, password }) {
    const user = await userService.getUserByEmail(email);
    if (!user) {
      const err = new Error("Thông tin đăng nhập không hợp lệ");
      err.status = 401;
      throw err;
    }
    console.log(user);
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      const err = new Error("Thông tin đăng nhập không hợp lệ");
      err.status = 401;
      throw err;
    }
    if (user.is_active === false) {
      const err = new Error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
      err.status = 403;
      throw err;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });
    return { user, token };
  },

  // Quên mật khẩu
  async forgotPassword(email) {
    const user = await userService.getUserByEmail(email);
    if (!user) {
      const err = new Error("Email not found");
      err.status = 404;
      throw err;
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await hashOtp(otp);
    await prisma.user.update({
      where: { email },
      data: {
        reset_otp_hash: otpHash,
        reset_otp_expires: new Date(Date.now() + 5 * 60 * 1000),  // 5 phút từ bây giờ
      },
    });

    console.log("Verifying OTP for email:", email);
    console.log("OTP hash from request:", otpHash);
    console.log("Current time:", new Date());

    await sendResetOtpEmail(email, otp, "Xác nhận đặt lại mật khẩu");
      return {
        message: "OTP has been sent to your email",
    };
    
  },

  // đặt lại mật khẩu
  async resetPasswordWithOtp(email, otp, newPassword) {
    const user = await prisma.user.findFirst({
      where: {
        email,
        reset_otp_expires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      const err = new Error("OTP invalid or expired");
      err.status = 400;
      throw err;
    }

    const isValid = await compareOtp(otp, user.reset_otp_hash);
    if (!isValid) {
      throw new Error("OTP invalid or expired");
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { email },
      data: {
        password_hash: hashedPassword,
        reset_otp_hash: null,
        reset_otp_expires: null,
      },
    });

    return { message: "Password reset successfully" };
  },
  
    // tìm kiếm lớp học theo tên
  async searchClassesByName(name) {
    const users = await prisma.Renamedclass.findMany({
      where: {
        name: {
          contains: name,
          mode: "insensitive",
        },
      },
    });
    return users;
  }

};