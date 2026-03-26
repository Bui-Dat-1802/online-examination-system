const jwt = require("jsonwebtoken");
const userService = require("../services/userService");
const { hashPassword, comparePassword } = require("../utils/hash");
const JWT_SECRET = process.env.JWT_SECRET || "Password123!!!";


module.exports = {
  async getUsers(req, res, next) {
    try {
      const users = await userService.getUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) return res.status(404).json({ error: "Người dùng không tồn tại" });
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
  
  async me(req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ error: "Không có quyền truy cập" });
      const user = await userService.me(req.user.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async createUser(req, res, next) {
    try {
      const { email, name, password_hash, role_id } = req.body;
      const newUser = await userService.createUser({
        email,
        name,
        password_hash,
        role_id,
      });
      res.status(201).json(newUser);
    } catch (err) {
      next(err);
    }
  },
  async updatePass(req, res, next) {
    try {
      const odd = req.body.oldPassword;
      const newPassword = req.body.password;
      const confirmPassword = req.body.confirmPassword;
      if (!odd || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Mật khẩu mới và xác nhận mật khẩu không khớp" });
      }
      const user = await userService.me(req.user.id);
      const isMatch = await comparePassword(odd, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: "Mật khẩu cũ không đúng" });
      }
      const updated = await userService.updatePass(req.user.id, newPassword);
      res.json({ message: "Cập nhật mật khẩu thành công" });
    } catch (err) {
      next(err);
    }
  },
  async updateUser(req, res, next) {
    try {
      const updated = await userService.updateUser(req.user.id, req.body);
      res.json({ message: "Cập nhật thông tin thành công" });
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req, res, next) {
    try {
      await userService.deleteUser(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
