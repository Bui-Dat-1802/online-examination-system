# TÀI LIỆU API - USER CHUNG / AUTH

Nguồn đối chiếu code: `backend/src/server.js`, `backend/src/routes/index.js`, `authRoutes.js`, `userRoutes.js`, `uploadRoutes.js`, `mediaRoutes.js`, `authController.js`, `userController.js`, `mediaController.js`, `authService.js`, `userService.js`.

- Local Base URL: `http://localhost:3000/api`
- Production Base URL: chưa có domain thật trong repo, dùng `https://<your-production-domain>/api` khi triển khai.
- Header đăng nhập: `Authorization: Bearer <accessToken>`.
- Chi tiết đầy đủ từng API xem file tổng hợp: `backend/tailieuAPI/tailieuAPI.md`.

## Auth / Đăng ký đăng nhập

### Gửi OTP đăng ký
- Method: POST
- Endpoint: `/api/auth/register-request`
- Quyền truy cập: Public
- Body: `email`, `password`, `name`, tùy chọn `role_id` hoặc `role_name`.
- Response thành công: `{ "message": "OTP has been sent to your email" }`
- Response lỗi phổ biến: `{ "error": "Missing required fields" }`, `{ "error": "Email already in use" }`
- Ghi chú: Thay thế API cũ `/api/auth/register`.

### Xác nhận OTP đăng ký
- Method: POST
- Endpoint: `/api/auth/register-confirm`
- Quyền truy cập: Public
- Body: `email`, `otp`.
- Response thành công: `{ "message": "User registered successfully", "user_id": "uuid" }`
- Response lỗi phổ biến: OTP sai/hết hạn/đã dùng/quá số lần thử.

### Đăng nhập
- Method: POST
- Endpoint: `/api/auth/login`
- Quyền truy cập: Public
- Body: `email`, `password`.
- Response thành công: `message`, `user`, `token`, `refreshToken`.
- Response lỗi phổ biến: thông tin đăng nhập không hợp lệ, tài khoản bị khóa.

### Refresh token
- Method: POST
- Endpoint: `/api/auth/refresh`
- Quyền truy cập: Public
- Body: `refreshToken`.
- Response thành công: `user`, `token`, `refreshToken` mới.
- Response lỗi phổ biến: `{ "error": "refreshToken required" }`, `{ "error": "Invalid or expired refresh token" }`

### Đăng xuất
- Method: POST
- Endpoint: `/api/auth/logout`
- Quyền truy cập: Public
- Body: `refreshToken`.
- Response thành công: HTTP 204.
- Response lỗi phổ biến: `{ "error": "refreshToken required" }`

### Quên mật khẩu
- Method: POST
- Endpoint: `/api/auth/forgot-password`
- Quyền truy cập: Public
- Body: `email`.
- Response thành công: `{ "message": "OTP has been sent to your email" }`
- Response lỗi phổ biến: `{ "error": "Email not found" }`

### Đặt lại mật khẩu
- Method: POST
- Endpoint: `/api/auth/reset-password`
- Quyền truy cập: Public
- Body: `email`, `otp`, `newPassword`.
- Response thành công: `{ "message": "Password reset successfully" }`
- Response lỗi phổ biến: `{ "error": "OTP invalid or expired" }`

### Tìm kiếm lớp theo tên
- Method: GET
- Endpoint: `/api/auth/classes/search`
- Quyền truy cập: Public
- Query: `name` bắt buộc.
- Response thành công: mảng lớp học.
- Response lỗi phổ biến: thiếu query `name`.

## User chung

### Lấy danh sách user cơ bản
- Method: GET
- Endpoint: `/api/users`
- Quyền truy cập: Authenticated
- Response thành công: mảng user cơ bản.

### Lấy profile hiện tại
- Method: GET
- Endpoint: `/api/users/me`
- Quyền truy cập: Authenticated
- Response thành công: user hiện tại.
- Ghi chú: Service hiện trả trực tiếp bản ghi user.

### Tạo user trực tiếp
- Method: POST
- Endpoint: `/api/users`
- Quyền truy cập: Authenticated
- Body: `email`, `name`, `password_hash`, `role_id`.
- Response thành công: user mới.
- Ghi chú: Endpoint đang active nhưng chưa gắn middleware admin.

### Cập nhật profile hiện tại
- Method: PUT
- Endpoint: `/api/users/update`
- Quyền truy cập: Authenticated
- Body: các trường profile như `name`, `bio`.
- Response thành công: `{ "message": "Cập nhật thông tin thành công" }`
- Ghi chú: Không cho cập nhật trực tiếp `email`, `role_id`.

### Đổi mật khẩu
- Method: PUT
- Endpoint: `/api/users/update-password`
- Quyền truy cập: Authenticated
- Body: `oldPassword`, `password`, `confirmPassword`.
- Response thành công: `{ "message": "Cập nhật mật khẩu thành công" }`
- Response lỗi phổ biến: thiếu thông tin, xác nhận mật khẩu không khớp, mật khẩu cũ sai.

### Lấy user theo ID
- Method: GET
- Endpoint: `/api/users/:id`
- Quyền truy cập: Authenticated
- Params: `id`.
- Response thành công: thông tin user cơ bản.

### Xóa user theo ID
- Method: DELETE
- Endpoint: `/api/users/:id`
- Quyền truy cập: Authenticated
- Params: `id`.
- Response thành công: HTTP 204.
- Ghi chú: Endpoint đang active nhưng chưa gắn middleware admin.

## File upload / Media chung

### Upload ảnh
- Method: POST
- Endpoint: `/api/upload/image`
- Quyền truy cập: Public trong router hiện tại.
- Upload file: `multipart/form-data`, field `image`, MIME `jpeg/png/webp/gif`, tối đa 5MB.
- Response thành công: `url`, `publicId`, `width`, `height`, `format`.

### Lấy media import
- Method: GET
- Endpoint: `/api/media/imported/*`
- Quyền truy cập: Authenticated
- Params: đường dẫn file sau `/imported/`.
- Response thành công: file binary.

## API cũ/không còn sử dụng

- `POST /api/auth/register`: không còn route active, đã thay bằng `register-request` và `register-confirm`.
- `/api/exam-import/*`: mount trong `server.js` đang bị comment; import đề active nằm dưới `/api/teacher/questions/import/*`.
