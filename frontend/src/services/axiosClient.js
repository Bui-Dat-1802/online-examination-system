import axios from 'axios';

// 1. Tạo instance
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. Interceptor REQUEST: Gắn Token vào mọi request gửi đi
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Interceptor RESPONSE: Xử lý khi Token hết hạn (Lỗi 401)
axiosClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi là 401 (Unauthorized) và chưa từng retry (tránh lặp vô tận)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // Đánh dấu đã thử refresh

            if (originalRequest.url.includes('/auth/login')) {
                return Promise.reject(error);
            }

            try {
                // Lấy refreshToken từ LocalStorage
                const refreshToken = localStorage.getItem('refreshToken');

                if (!refreshToken) {
                    // Không có refresh token thì logout luôn
                    throw new Error('No refresh token');
                }

                // Gọi API refresh (Dùng axios gốc để tránh lặp interceptor)
                // Lưu ý: Phải dùng đúng baseURL như axiosClient
                const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
                const res = await axios.post(`${BACKEND_URL}/auth/refresh`, {
                    refreshToken: refreshToken
                });

                if (res.status === 200) {
                    const { token, refreshToken: newRefreshToken } = res.data;

                    // 1. Lưu token mới vào LocalStorage
                    localStorage.setItem('accessToken', token);
                    localStorage.setItem('refreshToken', newRefreshToken);

                    // 2. Gắn token mới vào header của request bị lỗi lúc nãy
                    axiosClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;

                    // 3. Thực hiện lại request cũ
                    return axiosClient(originalRequest);
                }
            } catch (refreshError) {
                // Nếu refresh cũng lỗi (token hết hạn hẳn) -> Logout sạch sẽ
                console.error("Phiên đăng nhập hết hạn:", refreshError);
                localStorage.clear();
                window.location.href = '/login'; // Chuyển hướng về trang login
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;