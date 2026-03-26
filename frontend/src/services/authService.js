import axiosClient from './axiosClient';

const authService = {
    // API 1: Đăng ký
    registerRequest(data) {
        return axiosClient.post('/api/auth/register-request', data);
    },

    otp(data) {
        // data: { email, otp }
        return axiosClient.post('/api/auth/register-confirm', data);
    },

    // API 2: Đăng nhập
    login(data) {
        // su dung khi co backend
        return axiosClient.post('/api/auth/login', data);
    },

    // API 3: Refresh Token
    refreshToken(refreshToken) {
        return axiosClient.post('/api/auth/refresh', { refreshToken });
    },

    // API 4: Lấy thông tin user hiện tại
    getCurrentUser() {
        //su dung khi co backend that
        return axiosClient.get('/api/users/me');

    },

    // API5: Cập nhật thông tin user hiện tại
    updateProfile(data) {
        // data: { name, bio}
        return axiosClient.put('/api/users/update', data);
    },

    // API6: ĐỔI MẬT KHẨU ---
    changePassword(data) {
        // data: { password, oldPassword, confirmPassword }
        return axiosClient.put('/api/users/update-password', data);
    },
    // --- ENDPOINT 7: YÊU CẦU GỬI OTP ---
    forgotPassword(email) {
        return axiosClient.post('/api/auth/forgot-password', { email });
    },

    // --- ENDPOINT 8: RESET MẬT KHẨU (Gửi kèm OTP và Pass mới) ---
    resetPassword(data) {
        // data: { email, otp, newPassword }
        return axiosClient.post('/api/auth/reset-password', data);
    }
};

export default authService;