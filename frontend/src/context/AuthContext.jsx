// src/context/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // --- 1. Hàm này CHỈ DÙNG KHI F5 (Reload trang) ---
    const fetchUserProfile = async (isReload = false) => {
        try {
            const response = await authService.getCurrentUser();
            setUser(response.data);
            return response.data;
        } catch (error) {
            console.error("Lỗi lấy thông tin user:", error);

            // CHỈ LOGOUT KHI ĐANG RELOAD TRANG (F5) MÀ TOKEN HỎNG
            if (isReload) {
                logout();
            } else {
                // Nếu bấm vào tên mà lỗi thì ném lỗi ra để component xử lý (hiện alert)
                throw error;
            }
        } finally {
            setLoading(false);
        }
    };

    // --- 2. Check token khi F5 ---
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            fetchUserProfile(); // Gọi API 4
        } else {
            setLoading(false);
        }
    }, []);

    // --- 3. HÀM LOGIN (ĐÃ SỬA: KHÔNG GỌI API 4 NỮA) ---
    const login = async (email, password) => {
        try {
            // Bước A: Gọi API Login (Endpoint 2)
            const response = await authService.login({ email, password });

            // API trả về: { message, user, token, refreshToken }
            const { user: userData, token, refreshToken } = response.data;

            // Bước B: Lưu token
            localStorage.setItem('accessToken', token);
            localStorage.setItem('refreshToken', refreshToken);

            // Bước C: LƯU NGAY DATA TỪ API LOGIN VÀO STATE
            // (Không gọi fetchUserProfile() ở đây nữa -> Tránh request thừa "me")
            setUser(userData);

            // Bước D: Điều hướng ngay lập tức
            if (userData.role_name === 'teacher') {
                navigate('/teacher/dashboard');
            } else if (userData.role_name === 'student') {
                navigate('/student/dashboard');
            } else {
                navigate('/admin/dashboard');
            }
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        navigate('/login');
    };

    return (
        // Export fetchUserProfile để dùng khi bấm vào Header (nếu cần)
        <AuthContext.Provider value={{ user, login, logout, fetchUserProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};