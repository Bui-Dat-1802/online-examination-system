const prisma = require("../prisma");
const { hashPassword } = require("../utils/hash");

module.exports = {
  /**
   * Ghi nhận một hành động của admin
   * @param {Object} actionData - Thông tin hành động
   * @param {string} actionData.adminId - ID của admin
   * @param {string} actionData.actionType - Loại hành động
   * @param {string} [actionData.targetType] - Loại đối tượng bị tác động
   * @param {string} [actionData.targetId] - ID của đối tượng bị tác động
   * @param {string} [actionData.description] - Mô tả hành động
   * @param {Object} [actionData.metadata] - Thông tin bổ sung
   * @param {string} [actionData.ipAddress] - IP address của admin
   * @returns {Promise<Object>} Hành động đã được ghi nhận
   */
  async logAdminAction(actionData) {
    const {
      adminId,
      actionType,
      targetType,
      targetId,
      description,
      metadata,
      ipAddress
    } = actionData;

    return await prisma.admin_action.create({
      data: {
        admin_id: adminId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        description: description,
        metadata: metadata,
        ip_address: ipAddress
      }
    });
  },

  /**
   * Lấy lịch sử hoạt động của một admin
   * @param {string} adminId - ID của admin
   * @param {Object} options - Tùy chọn lọc
   * @returns {Promise<Array>} Danh sách hoạt động
   */
  async getAdminActivities(adminId, options = {}) {
    const { limit = 50, page = 1, actionType } = options;
    const skip = (page - 1) * limit;

    const where = {
      admin_id: adminId
    };

    if (actionType) {
      where.action_type = actionType;
    }

    const [activities, total] = await Promise.all([
      prisma.admin_action.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          action_type: true,
          target_type: true,
          target_id: true,
          description: true,
          metadata: true,
          ip_address: true,
          created_at: true
        }
      }),
      prisma.admin_action.count({ where })
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Lấy danh sách tất cả người dùng với thông tin chi tiết
   * @param {Object} filters - Bộ lọc (role, status, search)
   * @returns {Promise<Array>} Danh sách người dùng
   */
  async getAllUsers(filters = {}) {
    const { role, status, search, page = 1, limit = 50 } = filters;
    
    const where = {};
    
    // Lọc theo role
    if (role) {
      const roleRecord = await prisma.auth_role.findUnique({
        where: { name: role }
      });
      if (roleRecord) {
        where.role_id = roleRecord.id;
      }
    }
    
    // Lọc theo status (is_active)
    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'locked') {
      where.is_active = false;
    }
    
    // Tìm kiếm theo tên hoặc email
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          is_active: true,
          created_at: true,
          last_login_at: true,
          auth_role: {
            select: {
              name: true,
              id: true
            }
          },
          refresh_token: {
            select: {
              id: true,
              revoked: true,
              expires_at: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);
    
    // Format response
    const formatted = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.auth_role?.name || 'unknown',
      role_id: user.auth_role?.id,
      status: user.is_active ? 'active' : 'locked',
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      active_sessions: user.refresh_token.filter(
        t => !t.revoked && t.expires_at > new Date()
      ).length
    }));
    
    return {
      users: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Lấy thông tin chi tiết một người dùng
   * @param {string} userId - ID người dùng
   * @returns {Promise<Object>} Thông tin người dùng
   */
  async getUserDetails(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        auth_role: {
          select: {
            id: true,
            name: true
          }
        },
        refresh_token: {
          select: {
            id: true,
            revoked: true,
            created_at: true,
            expires_at: true,
            ip: true
          },
          orderBy: {
            created_at: 'desc'
          }
        },
        Renamedclass: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        enrollment_request_enrollment_request_student_idTouser: {
          select: {
            id: true,
            status: true,
            requested_at: true
          }
        }
      }
    });
    
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      role: user.auth_role?.name,
      role_id: user.auth_role?.id,
      status: user.is_active ? 'active' : 'locked',
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
      classes_count: user.Renamedclass?.length || 0,
      enrollments_count: user.enrollment_request_enrollment_request_student_idTouser?.length || 0,
      sessions: user.refresh_token.map(t => ({
        id: t.id,
        ip: t.ip,
        created_at: t.created_at,
        expires_at: t.expires_at,
        is_active: !t.revoked && t.expires_at > new Date()
      }))
    };
  },

  /**
   * Khóa hoặc mở khóa tài khoản người dùng
   * @param {string} userId - ID người dùng
   * @param {boolean} isActive - true để mở khóa, false để khóa
   * @param {string} adminId - ID của admin thực hiện
   * @param {string} ipAddress - IP address của admin
   * @returns {Promise<Object>} Kết quả
   */
  async toggleUserStatus(userId, isActive, adminId, ipAddress) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, is_active: true, email: true, name: true }
    });
    
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { is_active: isActive },
      select: {
        id: true,
        email: true,
        name: true,
        is_active: true
      }
    });

    // Log admin action
    if (adminId) {
      await this.logAdminAction({
        adminId,
        actionType: isActive ? 'UNLOCK_USER' : 'LOCK_USER',
        targetType: 'user',
        targetId: userId,
        description: `${isActive ? 'Mở khóa' : 'Khóa'} tài khoản ${user.email}`,
        metadata: { user_email: user.email, user_name: user.name },
        ipAddress
      });
    }
    
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      status: updated.is_active ? 'active' : 'locked',
      message: isActive ? 'User unlocked successfully' : 'User locked successfully'
    };
  },

  /**
   * Reset mật khẩu người dùng về mật khẩu mặc định
   * @param {string} userId - ID người dùng
   * @param {string} newPassword - Mật khẩu mới (mặc định: "Password123")
   * @param {string} adminId - ID của admin thực hiện
   * @param {string} ipAddress - IP address của admin
   * @returns {Promise<Object>} Kết quả
   */
  async resetUserPassword(userId, newPassword = "Password123", adminId, ipAddress) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });
    
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    
    const hashedPassword = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: hashedPassword }
    });

    // Log admin action
    if (adminId) {
      await this.logAdminAction({
        adminId,
        actionType: 'RESET_PASSWORD',
        targetType: 'user',
        targetId: userId,
        description: `Reset mật khẩu cho tài khoản ${user.email}`,
        metadata: { user_email: user.email, user_name: user.name },
        ipAddress
      });
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      message: "Password reset successfully",
      temporary_password: newPassword
    };
  },


  /**
   * Lấy thống kê tổng quan
   * @returns {Promise<Object>} Thống kê
   */
  async getStatistics() {
    const [
      totalUsers,
      activeUsers,
      lockedUsers,
      studentCount,
      teacherCount,
      adminCount,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { is_active: true } }),
      prisma.user.count({ where: { is_active: false } }),
      prisma.user.count({
        where: {
          auth_role: { name: 'student' }
        }
      }),
      prisma.user.count({
        where: {
          auth_role: { name: 'teacher' }
        }
      }),
      prisma.user.count({
        where: {
          auth_role: { name: 'admin' }
        }
      }),
      prisma.user.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 ngày qua
          }
        }
      })
    ]);
    
    return {
      total_users: totalUsers,
      active_users: activeUsers,
      locked_users: lockedUsers,
      by_role: {
        student: studentCount,
        teacher: teacherCount,
        admin: adminCount
      },
      new_users_last_7_days: recentUsers
    };
  },

  // ==================== QUẢN LÝ LỚP HỌC ====================

  /**
   * Lấy danh sách tất cả lớp học trong hệ thống
   * @param {Object} filters - Bộ lọc (search, status, page, limit)
   * @returns {Promise<Object>} Danh sách lớp học
   */
  async getAllClasses(filters = {}) {
    const { search, status, page = 1, limit = 50, includeDeleted = false } = filters;
    
    const where = {
      is_deleted: includeDeleted ? undefined : false
    };
    
    // Tìm kiếm theo tên lớp hoặc code
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [classes, total] = await Promise.all([
      prisma.Renamedclass.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          created_at: true,
          updated_at: true,
          teacher_id: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          enrollment_request: {
            where: {
              status: 'approved'
            },
            select: {
              id: true
            }
          },
          exam_template: {
            select: {
              id: true
            }
          }
        }
      }),
      prisma.Renamedclass.count({ where })
    ]);
    
    // Format response
    const formatted = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      code: cls.code,
      description: cls.description,
      teacher: {
        id: cls.user.id,
        name: cls.user.name,
        email: cls.user.email
      },
      student_count: cls.enrollment_request.length,
      exam_count: cls.exam_template.length,
      created_at: cls.created_at,
      updated_at: cls.updated_at
    }));
    
    return {
      classes: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Lấy thông tin chi tiết một lớp học
   * @param {string} classId - ID lớp học
   * @returns {Promise<Object>} Thông tin lớp học
   */
  async getClassDetails(classId) {
    const classData = await prisma.Renamedclass.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        is_deleted: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        teacher_id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        enrollment_request: {
          where: {
            status: 'approved'
          },
          select: {
            id: true,
            student_id: true,
            requested_at: true,
            user_enrollment_request_student_idTouser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        exam_template: {
          where: {
            is_deleted: false
          },
          select: {
            id: true,
            title: true,
            duration_seconds: true,
            created_at: true
          }
        }
      }
    });
    
    if (!classData || classData.is_deleted) {
      const err = new Error("Class not found");
      err.status = 404;
      throw err;
    }
    
    return {
      id: classData.id,
      name: classData.name,
      code: classData.code,
      description: classData.description,
      teacher: {
        id: classData.user.id,
        name: classData.user.name,
        email: classData.user.email
      },
      students: classData.enrollment_request.map(e => ({
        id: e.user_enrollment_request_student_idTouser.id,
        name: e.user_enrollment_request_student_idTouser.name,
        email: e.user_enrollment_request_student_idTouser.email,
        enrolled_at: e.requested_at
      })),
      exams: classData.exam_template.map(e => ({
        id: e.id,
        title: e.title,
        duration_seconds: e.duration_seconds,
        created_at: e.created_at
      })),
      created_at: classData.created_at,
      updated_at: classData.updated_at
    };
  },


  async deleteClass(classId, adminId, ipAddress) {
    // Kiểm tra lớp học có tồn tại không và chưa bị xóa
    const classData = await prisma.Renamedclass.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        code: true,
        is_deleted: true,
        exam_template: {
          select: {
            id: true,
            exam_instance: {
              select: {
                id: true,
                exam_session: {
                  select: {
                    id: true,
                    state: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!classData || classData.is_deleted) {
      const err = new Error("Không tìm thấy lớp học");
      err.status = 404;
      throw err;
    }
    
    // Đếm số exam sessions theo trạng thái
    let totalSessions = 0;
    let activeSessions = 0; // Sessions đang started
    let submittedSessions = 0;
    
    for (const template of classData.exam_template) {
      for (const instance of template.exam_instance) {
        for (const session of instance.exam_session) {
          totalSessions++;
          if (session.state === 'started') {
            activeSessions++;
          } else if (session.state === 'submitted') {
            submittedSessions++;
          }
        }
      }
    }
    
    // Soft delete: Cho phép xóa ngay cả khi có dữ liệu thi
    // Vì đây là soft delete, dữ liệu không bị mất và có thể khôi phục
    // Cascade soft delete xuống exam_template và exam_instance
    await prisma.$transaction(async (tx) => {
      // 1. Xóa mềm tất cả exam_instance của lớp
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
            deleted_by: adminId
          }
        });

        // 2. Xóa mềm tất cả exam_template của lớp
        await tx.exam_template.updateMany({
          where: {
            class_id: classId,
            is_deleted: false
          },
          data: {
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: adminId
          }
        });
      }

      // 3. Xóa mềm lớp học
      await tx.Renamedclass.update({
        where: { id: classId },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: adminId
        }
      });
    });

    // Log admin action với thông tin chi tiết
    if (adminId) {
      await this.logAdminAction({
        adminId,
        actionType: 'DELETE_CLASS',
        targetType: 'class',
        targetId: classId,
        description: `Xóa lớp học ${classData.name} (${classData.code})`,
        metadata: { 
          class_name: classData.name, 
          class_code: classData.code,
          total_exam_sessions: totalSessions,
          active_sessions: activeSessions,
          submitted_sessions: submittedSessions,
          templates_archived: classData.exam_template.length,
          instances_archived: classData.exam_template.reduce((sum, t) => sum + t.exam_instance.length, 0)
        },
        ipAddress
      });
    }
    
    return {
      class_id: classData.id,
      class_name: classData.name,
      message: "Class and related exam templates/instances archived successfully (soft deleted)",
      details: {
        templates_archived: classData.exam_template.length,
        instances_archived: classData.exam_template.reduce((sum, t) => sum + t.exam_instance.length, 0)
      },
      warning: totalSessions > 0 ? `Lớp học có ${totalSessions} phiên thi (${activeSessions} đang thi, ${submittedSessions} đã nộp). Dữ liệu vẫn được giữ và có thể khôi phục.` : null
    };
  },

  /**
   * Khôi phục lớp học đã xóa (undelete)
   * @param {string} classId - ID lớp học
   * @param {string} adminId - ID của admin thực hiện
   * @param {string} ipAddress - IP address của admin
   * @returns {Promise<Object>} Kết quả
   */
  async restoreClass(classId, adminId, ipAddress) {
    const classData = await prisma.Renamedclass.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        code: true,
        is_deleted: true,
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
      const err = new Error("Không tìm thấy lớp học");
      err.status = 404;
      throw err;
    }

    if (!classData.is_deleted) {
      const err = new Error("Lớp học chưa bị xóa");
      err.status = 400;
      throw err;
    }

    // Khôi phục lớp học và cascade restore xuống exam_template và exam_instance
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

      // 2. Khôi phục tất cả exam_template của lớp
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

        // 3. Khôi phục tất cả exam_instance của những template đó
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

    // Log admin action
    if (adminId) {
      await this.logAdminAction({
        adminId,
        actionType: 'RESTORE_CLASS',
        targetType: 'class',
        targetId: classId,
        description: `Khôi phục lớp học ${classData.name} (${classData.code})`,
        metadata: { 
          class_name: classData.name, 
          class_code: classData.code,
          templates_restored: classData.exam_template.length,
          instances_restored: classData.exam_template.reduce((sum, t) => sum + t.exam_instance.length, 0)
        },
        ipAddress
      });
    }

    return {
      class_id: classData.id,
      class_name: classData.name,
      message: "Class and related exam templates/instances restored successfully",
      details: {
        templates_restored: classData.exam_template.length,
        instances_restored: classData.exam_template.reduce((sum, t) => sum + t.exam_instance.length, 0)
      }
    };
  },

  // ==================== QUẢN LÝ KỲ THI ====================

  /**
   * Lấy danh sách tất cả kỳ thi trong hệ thống
   * @param {Object} filters - Bộ lọc (status, search, page, limit)
   * @returns {Promise<Object>} Danh sách kỳ thi
   */
  async getAllExams(filters = {}) {
    const { status, search, page = 1, limit = 50 } = filters;
    
    const where = {
      is_deleted: false
    };
    
    // Tìm kiếm theo tên đề thi
    if (search) {
      where.exam_template = {
        title: { contains: search, mode: 'insensitive' },
        is_deleted: false
      };
    } else {
      where.exam_template = {
        is_deleted: false
      };
    }
    
    const skip = (page - 1) * limit;
    const now = new Date();
    
    const [exams, total] = await Promise.all([
      prisma.exam_instance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { starts_at: 'desc' },
        select: {
          id: true,
          starts_at: true,
          ends_at: true,
          published: true,
          created_at: true,
          show_answers: true,
          exam_template: {
            select: {
              id: true,
              title: true,
              duration_seconds: true,
              Renamedclass: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          exam_session: {
            select: {
              id: true,
              state: true
            }
          }
        }
      }),
      prisma.exam_instance.count({ where })
    ]);
    
    // Xác định trạng thái và format response
    const formatted = exams.map(exam => {
      let examStatus = 'upcoming'; // Chưa mở
      
      if (!exam.published) {
        examStatus = 'unpublished'; // Tạm dừng (unpublished)
      } else if (now >= exam.starts_at && now <= exam.ends_at) {
        examStatus = 'ongoing'; // Đang thi
      } else if (now > exam.ends_at) {
        examStatus = 'ended'; // Đã kết thúc
      }
      
      // Lọc theo status nếu có
      if (status && examStatus !== status) {
        return null;
      }
      
      return {
        id: exam.id,
        title: exam.exam_template?.title,
        class: {
          id: exam.exam_template?.Renamedclass?.id,
          name: exam.exam_template?.Renamedclass?.name,
          code: exam.exam_template?.Renamedclass?.code
        },
        teacher: {
          id: exam.exam_template?.Renamedclass?.user?.id,
          name: exam.exam_template?.Renamedclass?.user?.name,
          email: exam.exam_template?.Renamedclass?.user?.email
        },
        starts_at: exam.starts_at,
        ends_at: exam.ends_at,
        duration_seconds: exam.exam_template?.duration_seconds,
        published: exam.published,
        status: examStatus,
        total_sessions: exam.exam_session.length,
        submitted_sessions: exam.exam_session.filter(s => s.state === 'submitted').length,
        created_at: exam.created_at
      };
    }).filter(Boolean); // Loại bỏ null
    
    // Nếu filter theo status, cần tính lại total
    let finalTotal = total;
    if (status) {
      finalTotal = formatted.length;
    }
    
    return {
      exams: formatted,
      pagination: {
        page,
        limit,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limit)
      }
    };
  },

  /**
   * Lấy thông tin chi tiết một kỳ thi
   * @param {string} examId - ID exam instance
   * @returns {Promise<Object>} Thông tin kỳ thi
   */
  async getExamDetails(examId) {
    const now = new Date();
    
    const exam = await prisma.exam_instance.findUnique({
      where: { id: examId },
      select: {
        id: true,
        starts_at: true,
        ends_at: true,
        published: true,
        show_answers: true,
        created_at: true,
        exam_template: {
          select: {
            id: true,
            title: true,
            description: true,
            duration_seconds: true,
            passing_score: true,
            Renamedclass: {
              select: {
                id: true,
                name: true,
                code: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        exam_session: {
          select: {
            id: true,
            state: true,
            started_at: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            submission: {
              select: {
                score: true,
                max_score: true
              }
            }
          }
        },
        exam_question: {
          select: {
            id: true,
            points: true
          }
        }
      }
    });
    
    if (!exam) {
      const err = new Error("Exam not found");
      err.status = 404;
      throw err;
    }
    
    // Xác định trạng thái
    let examStatus = 'upcoming';
    if (!exam.published) {
      examStatus = 'suspended';
    } else if (now >= exam.starts_at && now <= exam.ends_at) {
      examStatus = 'ongoing';
    } else if (now > exam.ends_at) {
      examStatus = 'ended';
    }
    
    return {
      id: exam.id,
      title: exam.exam_template?.title,
      description: exam.exam_template?.description,
      class: {
        id: exam.exam_template?.Renamedclass?.id,
        name: exam.exam_template?.Renamedclass?.name,
        code: exam.exam_template?.Renamedclass?.code
      },
      teacher: {
        id: exam.exam_template?.Renamedclass?.user?.id,
        name: exam.exam_template?.Renamedclass?.user?.name,
        email: exam.exam_template?.Renamedclass?.user?.email
      },
      starts_at: exam.starts_at,
      ends_at: exam.ends_at,
      duration_seconds: exam.exam_template?.duration_seconds,
      passing_score: exam.exam_template?.passing_score,
      published: exam.published,
      show_answers: exam.show_answers,
      status: examStatus,
      question_count: exam.exam_question.length,
      sessions: exam.exam_session.map(s => ({
        id: s.id,
        state: s.state,
        started_at: s.started_at,
        student: {
          id: s.user.id,
          name: s.user.name,
          email: s.user.email
        },
        score: s.submission[0]?.score || null,
        max_score: s.submission[0]?.max_score || null
      })),
      created_at: exam.created_at
    };
  },

  /**
   * Lấy thống kê dashboard tổng quan
   * @returns {Promise<Object>} Thống kê dashboard
   */
  async getDashboardStats(adminId) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalClasses,
      totalExams,
      todaySubmissions,
      activeExams,
      upcomingExams,
      recentActivities
    ] = await Promise.all([
      // Tổng số người dùng
      prisma.user.count(),
      
      // Tổng số lớp học (không tính đã xóa mềm)
      prisma.Renamedclass.count({
        where: { is_deleted: false }
      }),
      
      // Tổng số kỳ thi (không tính đã xóa mềm)
      prisma.exam_instance.count({
        where: { is_deleted: false }
      }),
      
      // Số bài thi đã nộp hôm nay
      prisma.submission.count({
        where: {
          created_at: {
            gte: todayStart,
            lt: todayEnd
          }
        }
      }),
      
      // Số kỳ thi đang diễn ra (không tính đã xóa mềm)
      prisma.exam_instance.count({
        where: {
          is_deleted: false,
          published: true,
          starts_at: { lte: now },
          ends_at: { gte: now }
        }
      }),
      
      // Số kỳ thi sắp diễn ra (trong 7 ngày tới, không tính đã xóa mềm)
      prisma.exam_instance.count({
        where: {
          is_deleted: false,
          published: true,
          starts_at: {
            gt: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Lịch sử hoạt động của admin hiện tại (30 hoạt động gần nhất)
      adminId ? prisma.admin_action.findMany({
        where: {
          admin_id: adminId
        },
        take: 30,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          action_type: true,
          target_type: true,
          target_id: true,
          description: true,
          metadata: true,
          ip_address: true,
          created_at: true
        }
      }) : []
    ]);

    return {
      users: {
        total: totalUsers
      },
      classes: {
        total: totalClasses
      },
      exams: {
        total: totalExams,
        active: activeExams,
        upcoming: upcomingExams
      },
      submissions: {
        today: todaySubmissions
      },
      admin_activities: recentActivities
    };
  },

  /**
   * Xuất danh sách học sinh ra CSV
   * @param {Object} filters - Bộ lọc
   * @returns {Promise<String>} CSV string
   */
  async exportStudentList(filters = {}) {
    const { classId, status } = filters;
    
    let where = {
      auth_role: {
        name: 'student'
      }
    };
    
    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'locked') {
      where.is_active = false;
    }

    // Nếu có classId, filter students theo enrollment_request
    if (classId) {
      where.enrollment_request_enrollment_request_student_idTouser = {
        some: {
          class_id: classId,
          status: 'approved'
        }
      };
    }
    
    const students = await prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        is_active: true,
        created_at: true,
        last_login_at: true,
        enrollment_request_enrollment_request_student_idTouser: {
          where: {
            status: 'approved'
          },
          select: {
            Renamedclass: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      }
    });
    
    // Tạo CSV header
    let csv = 'ID,Email,Họ tên,Trạng thái,Lớp học,Ngày tạo,Đăng nhập gần nhất\n';
    
    // Thêm dữ liệu
    students.forEach(student => {
      const classes = student.enrollment_request_enrollment_request_student_idTouser
        .map(e => `${e.Renamedclass.name} (${e.Renamedclass.code})`)
        .join('; ');
      
      csv += `"${student.id}","${student.email}","${student.name}","${student.is_active ? 'Hoạt động' : 'Bị khóa'}","${classes}","${student.created_at.toISOString()}","${student.last_login_at ? student.last_login_at.toISOString() : 'Chưa đăng nhập'}"\n`;
    });
    
    return csv;
  },

  /**
   * Xuất kết quả thi ra CSV
   * @param {string} examInstanceId - ID kỳ thi
   * @returns {Promise<String>} CSV string
   */
  async exportExamResults(examInstanceId) {
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
                name: true,
                code: true
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
    
    // Tạo CSV header
    let csv = 'ID,Email,Họ tên,Trạng thái,Điểm,Điểm tối đa,Phần trăm,Kết quả,Thời gian bắt đầu,Thời gian nộp bài,Thời gian chấm\n';
    
    // Thêm dữ liệu
    exam.exam_session.forEach(session => {
      const submission = session.submission[0];
      const score = submission?.score || 0;
      const maxScore = submission?.max_score || 0;
      const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(2) : 0;
      const passingScore = exam.exam_template.passing_score || 0;
      const percent = Number(percentage);
      const pass = Number(passingScore);
      const passed = percent >= pass ? "Đạt" : "Không đạt"

      csv += `"${session.user.id}","${session.user.email}","${session.user.name}","${session.state}","${score}","${maxScore}","${percentage}%","${passed}","${session.started_at ? session.started_at.toISOString() : 'Chưa bắt đầu'}","${submission?.created_at ? submission.created_at.toISOString() : 'Chưa nộp'}","${submission?.graded_at ? submission.graded_at.toISOString() : 'Chưa chấm'}"\n`;
    });
    
    return csv;
  },

  /**
   * Xuất nhật ký thi ra CSV
   * @param {string} examInstanceId - ID kỳ thi
   * @returns {Promise<String>} CSV string
   */
  async exportExamLogs(examInstanceId) {
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

};
