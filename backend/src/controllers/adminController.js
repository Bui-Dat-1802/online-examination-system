const adminService = require("../services/adminService");

module.exports = {
  /**
   * GET /admin/users
   * Lấy danh sách tất cả người dùng với bộ lọc
   */
  async getUsers(req, res, next) {
    try {
      const { role, status, search, page, limit } = req.query;
      
      const result = await adminService.getAllUsers({
        role,
        status,
        search,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50
      });
      
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /admin/users/:id
   * Lấy thông tin chi tiết một người dùng
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await adminService.getUserDetails(id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /admin/users/:id/lock
   * Khóa tài khoản người dùng
   */
  async lockUser(req, res, next) {
    try {
      const { id } = req.params;
      
      // Không cho phép admin khóa chính mình
      if (id === req.user.id) {
        return res.status(403).json({ 
          error: "Không thể khóa chính tài khoản của bạn" 
        });
      }
      
      const result = await adminService.toggleUserStatus(
        id, 
        false, 
        req.user.id, 
        req.ip
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /admin/users/:id/unlock
   * Mở khóa tài khoản người dùng
   */
  async unlockUser(req, res, next) {
    try {
      const { id } = req.params;
      const result = await adminService.toggleUserStatus(
        id, 
        true, 
        req.user.id, 
        req.ip
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /admin/users/:id/reset-password
   * Reset mật khẩu người dùng
   * Body (optional): { password: "new_password" }
   */
  async resetPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      // Không cho phép admin reset mật khẩu của chính mình qua route này
      if (id === req.user.id) {
        return res.status(403).json({ 
          error: "Cannot reset your own password through admin panel. Use profile settings." 
        });
      }
      
      const result = await adminService.resetUserPassword(
        id, 
        password || "Password123",
        req.user.id,
        req.ip
      );
      
      res.json(result);
    } catch (err) {
      next(err);
    }
  },


  /**
   * GET /admin/statistics
   * Lấy thống kê tổng quan
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await adminService.getStatistics();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  // ==================== QUẢN LÝ LỚP HỌC ====================

  /**
   * GET /admin/classes
   * Lấy danh sách tất cả lớp học
   */
  async getClasses(req, res, next) {
    try {
      const { search, status, page, limit } = req.query;
      
      const result = await adminService.getAllClasses({
        search,
        status,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50
      });
      
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /admin/classes/:id
   * Lấy thông tin chi tiết một lớp học
   */
  async getClassById(req, res, next) {
    try {
      const { id } = req.params;
      const classData = await adminService.getClassDetails(id);
      res.json(classData);
    } catch (err) {
      next(err);
    }
  },


  async deleteClass(req, res, next) {
    try {
      const { id } = req.params;
      const result = await adminService.deleteClass(
        id, 
        req.user.id, 
        req.ip
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /admin/classes/:id/restore
   * Khôi phục lớp học đã xóa
   */
  async restoreClass(req, res, next) {
    try {
      const { id } = req.params;
      const result = await adminService.restoreClass(
        id, 
        req.user.id, 
        req.ip
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // ==================== QUẢN LÝ KỲ THI ====================

  /**
   * GET /admin/exams
   * Lấy danh sách tất cả kỳ thi
   */
  async getExams(req, res, next) {
    try {
      const { status, search, page, limit } = req.query;
      
      const result = await adminService.getAllExams({
        status,
        search,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50
      });
      
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /admin/exams/:id
   * Lấy thông tin chi tiết một kỳ thi
   */
  async getExamById(req, res, next) {
    try {
      const { id } = req.params;
      const exam = await adminService.getExamDetails(id);
      res.json(exam);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /admin/dashboard
   * Lấy thống kê dashboard tổng quan
   */
  async getDashboard(req, res, next) {
    try {
      const stats = await adminService.getDashboardStats(req.user.id);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /admin/activities
   * Lấy lịch sử hoạt động của admin
   * Query params: page, limit, actionType
   */
  async getActivities(req, res, next) {
    try {
      const { page, limit, actionType } = req.query;
      
      const result = await adminService.getAdminActivities(req.user.id, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        actionType
      });
      
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /admin/export/students
   * Xuất danh sách học sinh ra CSV
   * Query: ?classId=xxx&status=active|locked
   */
  async exportStudents(req, res, next) {
    try {
      const { classId, status } = req.query;
      const csv = await adminService.exportStudentList({ classId, status });
      
      // Set headers cho file CSV
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="danh-sach-hoc-sinh-${Date.now()}.csv"`);
      
      // Gửi CSV với BOM để Excel đọc UTF-8 đúng
      res.send('\uFEFF' + csv);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /admin/export/results/:examId
   * Xuất kết quả thi ra CSV
   */
  async exportResults(req, res, next) {
    try {
      const { examId } = req.params;
      const csv = await adminService.exportExamResults(examId);
      
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
   * GET /admin/export/logs/:examId
   * Xuất nhật ký thi ra CSV
   */
  async exportLogs(req, res, next) {
    try {
      const { examId } = req.params;
      const csv = await adminService.exportExamLogs(examId);
      
      // Set headers cho file CSV
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="nhat-ky-thi-${examId}-${Date.now()}.csv"`);
      
      // Gửi CSV với BOM để Excel đọc UTF-8 đúng
      res.send('\uFEFF' + csv);
    } catch (err) {
      next(err);
    }
  },

};
