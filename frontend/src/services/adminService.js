// src/services/adminService.js
import axiosClient from './axiosClient';

const adminService = {
    // --- ENDPOINT 9: LẤY THỐNG KÊ DASHBOARD ---
    getDashboardStats() {
        return axiosClient.get('/api/admin/dashboard');
    },

    // endpoint dùng cho quản lí users
    getUserStats() {
        return axiosClient.get('/api/admin/statistics');
    },

    getUsers(params) {
        return axiosClient.get('/api/admin/users', { params });
    },

    lockUser(userId) {

        return axiosClient.put(`/api/admin/users/${userId}/lock`);

    },

    unlockUser(userId) {
        return axiosClient.put(`/api/admin/users/${userId}/unlock`);
    },

    // --- ENDPOINT 6: RESET MẬT KHẨU ---
    resetUserPassword(userId, newPassword) {
        const payload = newPassword ? { password: newPassword } : {};
        return axiosClient.post(`/api/admin/users/${userId}/reset-password`, payload);

    },

    // endpoint dùng cho quản lí classes
    getAllClasses(params) {
        return axiosClient.get('/api/admin/classes', { params });

    },

    getClassDetail(id) {
        return axiosClient.get(`/api/admin/classes/${id}`);
    },

    exportStudents(classId, status) {
        // Gọi API với query params: ?classId=...&status=...
        return axiosClient.get('/api/admin/export/students', {
            params: {
                classId: classId, // Lọc theo lớp
                status: status    // Lọc theo trạng thái (active/locked)
            },
            responseType: 'blob' // Bắt buộc để tải file
        });
    },

    //endpoint dùng cho quản lí kỳ thi
    getExams(params) {
        return axiosClient.get('/api/admin/exams', { params });
    },

    getExamDetail(id) {
        return axiosClient.get(`/api/admin/exams/${id}`);
    },

    exportExamResults(examId) {
        return axiosClient.get(`/api/admin/export/results/${examId}`, {
            // QUAN TRỌNG: Báo cho axios biết server trả về file
            responseType: 'blob'
        });
    }

};

export default adminService;