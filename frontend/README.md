# Online Examination System - Frontend

Frontend của đồ án tốt nghiệp **Hệ thống thi trực tuyến**.

Ứng dụng web hỗ trợ quản trị viên, giáo viên và sinh viên trong quản lý lớp học, ngân hàng câu hỏi, đề thi, phiên thi, làm bài trực tuyến, giám sát và xem kết quả. Frontend kết nối với backend qua REST API và Socket.IO.

## Công nghệ

- React 19
- Vite
- React Router DOM
- Axios
- Socket.IO Client
- KaTeX
- React Toastify
- Sass/SCSS với CSS Modules

## Cài đặt

```bash
cd frontend
npm install
```

## Biến môi trường

Tạo file `.env` trong thư mục `frontend` nếu cần cấu hình endpoint khác mặc định:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

Không commit file `.env` chứa cấu hình thật hoặc thông tin nhạy cảm.

## Chạy dự án

Chạy môi trường phát triển:

```bash
npm run dev
```

Build bản production:

```bash
npm run build
```

Xem thử bản build:

```bash
npm run preview
```

Kiểm tra lint:

```bash
npm run lint
```

Frontend mặc định chạy tại `http://localhost:5173`.
