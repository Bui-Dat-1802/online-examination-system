const authService = require("../services/authService");
const   tokenService = require("../services/tokenService");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "Password123!!!";


module.exports = {
  // async register(req, res, next) {
  //   try {
  //     const { message } = await authService.register(req.body);
  //     res.status(201).json({ message: message });
  //   } catch (err) {
  //     next(err);
  //   }
  // },

  // đăng ký
  async registerRequest(req, res, next) {
    try {
      const data = req.body;
      const result = await authService.registerRequest(data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  // xác nhận opt để đăng ký
  async registerConfirm(req, res, next) {
    try {
      const data = req.body;  
      const result = await authService.registerConfirm(data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      const user = result.user || result;
      let token = result.token;
      if (!token) token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });

      const refresh = await tokenService.generateRefreshToken(user.id, req.ip);
      res.json({ message: "Login successful", user, token, refreshToken: refresh.token });
    } catch (err) {
      next(err);
    }
  },


  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });

      const rec = await tokenService.verifyRefreshToken(refreshToken);
      if (!rec) return res.status(401).json({ error: "Invalid or expired refresh token" });

      const user = await require("../services/userService").getUserById(rec.user_id);
      if (!user) return res.status(401).json({ error: "User not found" });

      // rotate: revoke old token and issue new one
      await tokenService.revokeById(rec.id);
      const newRefresh = await tokenService.generateRefreshToken(user.id, req.ip);

      const jwt = require("jsonwebtoken");
      const newAccess = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });

      res.json({ user, token: newAccess, refreshToken: newRefresh.token });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });
      await tokenService.revokeByToken(refreshToken);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  // Quên mật khẩu
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  // Đặt lại mật khẩu với OTP
  async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await authService.resetPasswordWithOtp(
        email,
        otp,
        newPassword
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  
  // tìm kiếm lớp học theo tên
  async searchClassesByName(req, res, next) {
    try {
      const { name } = req.query;
      if (!name) {
        return res.status(400).json({ error: "Vui lòng cung cấp tên lớp học để tìm kiếm" });
      }
      const classes = await authService.searchClassesByName(name);
      res.json(classes);
    } catch (err) {
      next(err);
    }
  },
};