// src/services/studentService.js
import axiosClient from './axiosClient';

const studentService = {
    // --- ENDPOINT 10: LẤY DASHBOARD SINH VIÊN ---
    getDashboard() {
        return axiosClient.get('/student/dashboard');
    },

    getExamOverview() {
        return axiosClient.get('/student/exams/overview');
    },
    // Endpoint 1: Enroll
    enrollClass(data) {
        return axiosClient.post('/student/enroll', data);
    },

    // Endpoint 2: Get Classes
    getClassesByStatus(status) {
        return axiosClient.get(`/student/classes?status=${status}`);
    },

    // Endpoint 3: Leave Class
    leaveClass(classId) {
        return axiosClient.delete(`/student/classes/${classId}`);
    },

    // --- ENDPOINT 10 (HỦY YÊU CẦU) ---
    cancelEnrollment(classId) {
        return axiosClient.post(`/student/classes/${classId}/cancel-enrollment`);
    },

    // Endpoint 4: Get Exams
    getExamsByClass(classId) {
        return axiosClient.get(`/student/exams/classes/${classId}`);
    },

    // --- ENDPOINT 5: BẮT ĐẦU LÀM BÀI ---
    startExam(examId) {
        return axiosClient.post(`/student/exams/${examId}/start`);
    },

    // --- ENDPOINT 6: LẤY CÂU HỎI (KHI RESUME/F5) ---
    getExamSessionQuestions(sessionId, sessionToken) {
        return axiosClient.get(`/student/sessions/${sessionId}/questions`, {
            headers: { 'X-Exam-Token': sessionToken }
        });
    },

    // --- ENDPOINT 7: HEARTBEAT (CHỐNG GIAN LẬN) ---
    sendHeartbeat(sessionId, sessionToken, focusLost) {
        return axiosClient.post(`/student/sessions/${sessionId}/heartbeat`,
            { focusLost },
            { headers: { 'X-Exam-Token': sessionToken } }
        );
    },

    // --- ENDPOINT 8: LƯU ĐÁP ÁN ---
    submitAnswer(sessionId, sessionToken, questionId, choiceIds) {
        return axiosClient.post(`/student/sessions/${sessionId}/answers`,
            { question_id: questionId, choice_ids: choiceIds },
            { headers: { 'X-Exam-Token': sessionToken } }
        );
    },

    // --- ENDPOINT 9: NỘP BÀI ---
    finishExam(sessionId, sessionToken) {
        return axiosClient.post(`/student/sessions/${sessionId}/submit`,
            {},
            { headers: { 'X-Exam-Token': sessionToken } }
        );
    },


};

// --- QUAN TRỌNG: PHẢI CÓ DÒNG NÀY Ở CUỐI ---
export default studentService;
