// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import styles from './RegisterPage.module.scss'; // Import CSS Module

const RegisterPage = () => {
    const navigate = useNavigate();

    // State quản lý dữ liệu form
    const [formData, setFormData] = useState({
        fullName: '',      // UI hiển thị "Họ và tên"
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student',   // Mặc định là học sinh
    });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Xử lý khi người dùng nhập liệu
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Dung de set router cho thay doi giua form register va otp
    const [step, setStep] = useState('register'); // 'register' | 'otp'
    const [otp, setOtp] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if (step === 'register') {
            handleRegisterRequest();
        } else {
            handleConfirmOtp();
        }
    };

    // Ham maskemail dung de che email luc hien thanh cong
    const maskEmail = (email) => {
        if (!email) return '';

        const [name, domain] = email.split('@');

        if (name.length <= 2) {
            return `${name[0]}*@${domain}`;
        }

        const visibleStart = name.slice(0, 2);
        const visibleEnd = name.slice(-1);

        return `${visibleStart}***${visibleEnd}@${domain}`;
    };


    // Xử lý khi nhấn Đăng ký => Gui OTP
    const handleRegisterRequest = async (e) => {
        setError('');
        setSuccess('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu nhập lại không khớp!');
            setLoading(false);
            return;
        }

        try {
            await authService.registerRequest({ //register goi API tao otp
                email: formData.email,
                name: formData.fullName,
                password: formData.password,
                role_name: formData.role,
            });

            setSuccess('OTP đã được gửi tới email của bạn'); 
            setStep('otp'); // chuan bi de goi toi API confirm OTP
            startCountdown();
        } catch (err) {
            setError(err.response?.data?.error || 'Gửi OTP thất bại');
        } finally {
            setLoading(false);
        }
    };

    // Xu ly dang nhap co OTP
    const handleConfirmOtp = async (e) => {
        setError('');
        setLoading(true);

        try {
            await authService.otp({
                email: formData.email,
                otp,
            });

            setSuccess('Đăng ký thành công!');

            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } 
        catch (err) {
            setError(err.response?.data?.error || 'OTP không hợp lệ');
        } 
        finally {
            setLoading(false);
        }
    };

    //Them phan countdown va nut gui lai OTP
    const [countdown, setCountdown] = useState(60); //Mac dinh 5p giong Backend
    const timerRef = React.useRef(null);
    const startCountdown = () => {
        setCountdown(60);

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResendOtp = async () => {
        try {
            await authService.registerRequest({
                email: formData.email,
                name: formData.fullName,
                password: formData.password,
                role_name: formData.role
            });

            setSuccess(`OTP mới đã được gửi tới ${maskEmail(formData.email)}`);
            startCountdown();
        } catch (err) {
            setError('Không thể gửi lại OTP. Vui lòng thử lại.');
        }
    };



    return (
        <div className={styles.registerContainer}>
            <form className={styles.registerForm} onSubmit={handleSubmit}>
                <div className={styles.formHeader}>
                    <h2>
                        {step === 'register' ? 'Đăng ký tài khoản' : 'Xác nhận OTP'}
                    </h2>
                    <p>
                        {step === 'register'
                            ? 'Chào mừng bạn đến với lớp học!'
                            : `OTP đã gửi tới ${maskEmail(formData.email)}`}
                    </p>
                </div>

                {error && <div className={styles.alertError}>{error}</div>}
                {success && <div className={styles.alertSuccess}>{success}</div>}

                {/*Form 1: REGISTER*/}
                {step === 'register' && (
                    <>
                        <div className={styles.formGroup}>
                            <label>Họ và tên</label>
                            <input 
                                name="fullName" 
                                placeholder="Nguyen Van A" 
                                value={formData.fullName} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Email</label>
                            <input 
                                type="email" 
                                name="email" 
                                placeholder="nguyenvan@gmail.com" 
                                value={formData.email} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Mật khẩu</label>
                            <input 
                                type="password" 
                                name="password" 
                                placeholder="Mat Khau phai co it nhat 8 chu" 
                                value={formData.password} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Nhập lại mật khẩu</label>
                            <input 
                                type="password" 
                                name="confirmPassword" 
                                placeholder="Nhap lai mat khau" 
                                value={formData.confirmPassword} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Vai trò</label>
                            <select name="role" value={formData.role} onChange={handleChange} className={styles.selectInput}>
                                <option value="student">Học sinh (Student)</option>
                                <option value="teacher">Giáo viên (Teacher)</option>
                            </select>
                        </div>
                    </>
                )}

                {/* Form 2: OTP */}
                {step === 'otp' && (
                    <>
                        <div className={styles.formGroup}>
                            <label>Mã OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Nhập mã OTP"
                                required
                            />
                        </div>

                        <div className={styles.resubmitBtn}>
                            {countdown > 0 ? (
                                <p>Gửi lại OTP sau <strong>{countdown}s</strong></p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    className={styles.resendBtn}
                                >
                                    Gửi lại OTP
                                </button>
                            )}
                        </div>
                    </>
                )}

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading
                        ? 'Đang xử lý...'
                        : step === 'register'
                            ? 'Gửi OTP'
                            : 'Xác nhận'}
                </button>

                {step === 'register' && (
                    <div className={styles.formFooter}>
                        <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
                    </div>
                )}
            </form>
        </div>
    );
};

export default RegisterPage;