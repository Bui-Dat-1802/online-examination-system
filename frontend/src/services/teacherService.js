// src/services/teacherService.js
import axiosClient from './axiosClient';

const teacherService = {
    // API 43 — lấy điểm theo kỳ thi
    getExamScores(classId, examInstanceId) {
        return axiosClient.get(
            `/api/teacher/classes/${classId}/exam-instances/${examInstanceId}/scores`
        );
    },

    // API 44 — lấy template đề thi theo lớp
    getExamTemplatesByClass(classId) {
        return axiosClient.get(
            `/api/teacher/classes/${classId}/exam-templates`
        );
    },

    // exams theo lớp
    getExamInstances(classId) {
        return axiosClient.get(`/api/teacher/classes/${classId}/exam-instances`);
    },

    // HS đang thi
    getActiveStudents(classId) {
        return axiosClient.get(`/api/teacher/classes/${classId}/active-students`);
    },

    // Tiến độ thi
    getExamProgress(classId, examInstanceId) {
        return axiosClient.get(
            `/api/teacher/classes/${classId}/exam-instances/${examInstanceId}/progress`
        );
    },

    // Vi phạm
    getClassFlags(examInstanceId) {
        return axiosClient.get(`/api/teacher/classes/${examInstanceId}/flags`);
    },

    // Cộng giờ
    addAccommodation(examInstanceId, data) {
        return axiosClient.post(
            `/api/teacher/exam-instances/${examInstanceId}/accommodations`,
            data
        );
    },

    // Khóa / mở phiên endpoint 36
    lockSession(sessionId, reason) {
        return axiosClient.post(`/api/teacher/exam-sessions/${sessionId}/lock`, { reason });
    },

    //endpoint 37
    unlockSession(sessionId, reason) {
        return axiosClient.post(`/api/teacher/exam-sessions/${sessionId}/unlock`, { reason });
    },

    // Endpoint 39: api lấy thông số cho giao diện dashboard teacher
    getDashboardData() {
        return axiosClient.get('/api/teacher/dashboard');
    },
    // Endpoint 7: Tạo lớp học mới
    createClass(data) {
        // data: { name, description }
        return axiosClient.post('/api/teacher/classes', data);
    },

    // --- THÊM HÀM NÀY (Endpoint 8) ---
    // Endpoint 8: Lấy danh sách lớp của giáo viên
    getClasses() {
        return axiosClient.get('/api/teacher/classes');

    },

    // --- THÊM HÀM NÀY (Endpoint 9) ---
    getClassDetail(id) {
        //1. Khi có backend
        return axiosClient.get(`/api/teacher/classes/${id}`);

    },

    // Xóa lớp theo id(Endpiont 11)
    deleteClass(id) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.delete(`/api/teacher/classes/${id}`);

    },

    // Endpoint 12: Lấy danh sách yêu cầu tham gia (Pending)
    getEnrollmentRequests(classId) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.get(`/api/teacher/classes/${classId}/enrollment-requests`);

    },

    // --- THÊM HÀM MỚI (Endpoint 13) ---
    respondToEnrollment(requestId, status) {
        const payload = {
            status: status,
            requestId: requestId
        };
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.post('/api/teacher/enrollment-requests/approve', payload);

    },

    // --- ENDPOINT 15: TẠO CÂU HỎI ---
    createQuestion(data) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.post('/api/teacher/questions', data);

    },

    // --- ENDPOINT 16: LẤY DANH SÁCH CÂU HỎI ---
    getQuestions() {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.get('/api/teacher/questions');
    },

    // --- THÊM MỚI: ENDPOINT 17 (SỬA CÂU HỎI) ---
    updateQuestion(id, data) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.put(`/api/teacher/questions/${id}`, data);

    },

    // --- THÊM MỚI: ENDPOINT 18 (XÓA CÂU HỎI) ---
    deleteQuestion(id) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.delete(`/api/teacher/questions/${id}`);

    },

    // --- ENDPOINT 19: LẤY CHI TIẾT CÂU HỎI ---
    getQuestionDetail(id) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.get(`/api/teacher/questions/${id}`);

    },

    // --- ENDPOINT 26: TẠO TEMPLATE ---
    createExamTemplate(data) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.post('/api/teacher/exam-templates', data);

    },

    // --- ENDPOINT 27: LẤY DANH SÁCH TEMPLATE ---
    getExamTemplates() {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.get('/api/teacher/exam-templates');
    },

    // --- ENDPOINT 28: CHỈNH SỬA TEMPLATE ---
    updateExamTemplate(id, data) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.put(`/api/teacher/exam-templates/${id}`, data);

    },

    // --- ENDPOINT 29: XÓA TEMPLATE ---
    deleteExamTemplate(id) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.delete(`/api/teacher/exam-templates/${id}`);
    },

    // --- THÊM ENDPOINT 30: TÌM KIẾM ---
    searchExamTemplates(keyword) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.get(`/api/teacher/exam-templates/search?keyword=${keyword}`);

    },

    // --- ENDPOINT 20: TẠO ĐỀ THI ---
    createExam(data) {
        // --- KHI CÓ BACKEND: Bỏ comment dòng này ---
        return axiosClient.post('/api/teacher/exam-instances', data);

    },

    // --- ENDPOINT 22: LẤY DS ĐỀ THI THEO TEMPLATE ---
    getExamInstancesByTemplate(templateId) {
        return axiosClient.get(`/api/teacher/exam-templates/${templateId}/exam-instances`);
    },

    // --- ENDPOINT 23: SỬA ĐỀ THI ---
    updateExamInstance(id, data) {
        // --- KHI CÓ BACKEND: Bỏ comment ---
        return axiosClient.put(`/api/teacher/exam-instances/${id}`, data);

    },

    // --- ENDPOINT 21: XÓA ĐỀ THI ---
    deleteExamInstance(id) {
        return axiosClient.delete(`/api/teacher/exam-instances/${id}`);
    },

    // --- ENDPOINT 24: LẤY CHI TIẾT ĐỀ THI ---
    getExamInstanceDetail(id) {
        return axiosClient.get(`/api/teacher/exam-instances/${id}`);
    },

    // --- ENDPOINT 41: XUẤT KẾT QUẢ THI (CSV) ---
    exportResults(examId) {
        // responseType blob so we can download CSV
        return axiosClient.get(`/api/teacher/export/results/${examId}`, { responseType: 'blob' });
    },

    // --- ENDPOINT 42: XUẤT NHẬT KÝ THI (CSV) ---
    exportLogs(examId) {
        return axiosClient.get(`/api/teacher/export/logs/${examId}`, { responseType: 'blob' });
    },

    // --- ENDPOINT 45: XÓA HỌC SINH KHỎI LỚP ---
    removeStudentFromClass(classId, studentId) {
        return axiosClient.delete(`/api/teacher/classes/${classId}/students/${studentId}`);
    },

};

export default teacherService;