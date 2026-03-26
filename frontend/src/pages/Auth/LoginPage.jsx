import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import styles from './LoginPage.module.scss';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Gọi hàm login từ Context
            await login(email, password);
            // Nếu thành công, Context sẽ tự động chuyển trang (navigate)
        } catch (err) {
            // API trả về lỗi dạng: { "error": "Invalid credentials" }
            // Chúng ta ưu tiên lấy 'error', nếu không có thì lấy 'message', cuối cùng là text mặc định
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Đăng nhập thất bại.';
            setError(errorMsg);
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <form className={styles.loginForm} onSubmit={handleSubmit}>
                <div className={styles.formHeader}>
                    {/* Icon user */}
                    <i className="fas fa-user-circle"></i>
                    <h2>Đăng nhập</h2>
                </div>

                {/* Hiển thị lỗi nếu có */}
                {error && <div className={styles.errorMessage}>{error}</div>}

                <div className={styles.formGroup}>
                    <label htmlFor="email">Email</label>
                    <input
                        type="email" // Đổi thành type email để browser hỗ trợ validate
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="user@example.com"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="password">Mật khẩu</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Nhập mật khẩu"
                    />
                </div>

                <button type="submit" className={styles.loginButton} disabled={loading}>
                    {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>

                <div className={styles.formFooter}>
                    <Link to="/register">Chưa có tài khoản? Đăng ký</Link>
                    <Link to="/forgot-password" style={{ color: '#666' }}>Quên mật khẩu?</Link>
                </div>
            </form>
        </div>
    );
};

export default LoginPage;