import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import styles from './ForgotPasswordPage.module.scss'; // Tạo file css ở bước 3

const ForgotPasswordPage = () => {
    const navigate = useNavigate();

    // State quản lý các bước (1: Nhập email, 2: Nhập OTP & Pass mới)
    const [step, setStep] = useState(1);

    // State dữ liệu
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // State UI
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // --- BƯỚC 1: GỬI YÊU CẦU OTP ---
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            // Gọi API Endpoint 7
            const res = await authService.forgotPassword(email);

            setMessage(res.data.message || "OTP đã được gửi đến email của bạn.");
            // Chuyển sang bước 2
            setStep(2);
        } catch (err) {
            setMessage('');
            setError(err.response?.data?.error || "Không tìm thấy email hoặc lỗi hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    // --- BƯỚC 2: XÁC NHẬN OTP & ĐỔI MẬT KHẨU ---
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Gọi API Endpoint 8
            const payload = {
                email: email,       // Email từ bước 1
                otp: otp,           // OTP người dùng nhập
                newPassword: newPassword // Mật khẩu mới
            };

            const res = await authService.resetPassword(payload);

            setError('');

            alert(res.data.message || "Đặt lại mật khẩu thành công! Vui lòng đăng nhập.");

            // Chuyển hướng về trang Login
            navigate('/login');

        } catch (err) {
            setMessage('');
            setError(err.response?.data?.error || "OTP không hợp lệ hoặc đã hết hạn.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h2>Quên mật khẩu</h2>
                    <p>
                        {step === 1
                            ? "Nhập email để nhận mã xác thực OTP"
                            : "Nhập mã OTP và mật khẩu mới để khôi phục"}
                    </p>
                </div>

                {message && <div className={styles.alertSuccess}>{message}</div>}
                {error && <div className={styles.alertError}>{error}</div>}

                {/* --- FORM BƯỚC 1 --- */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp}>
                        <div className={styles.formGroup}>
                            <label>Email đăng ký</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <button type="submit" className={styles.btnSubmit} disabled={loading}>
                            {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
                        </button>
                    </form>
                )}

                {/* --- FORM BƯỚC 2 --- */}
                {step === 2 && (
                    <form onSubmit={handleResetPassword}>
                        <div className={styles.formGroup}>
                            <label>Email</label>
                            <input type="email" value={email} disabled className={styles.disabledInput} />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Mã OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Nhập mã 6 số"
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Mật khẩu mới</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nhập mật khẩu mới"
                                required
                                minLength={6}
                            />
                        </div>

                        <button type="submit" className={styles.btnSubmit} disabled={loading}>
                            {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                        </button>

                        <div className={styles.resendLink} onClick={() => setStep(1)}>
                            Chưa nhận được mã? Gửi lại
                        </div>
                    </form>
                )}

                <div className={styles.footer}>
                    <Link to="/login">Quay lại Đăng nhập</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;