# TÀI LIỆU API BACKEND - ONLINE EXAMINATION SYSTEM

Tài liệu này được cập nhật theo code backend hiện tại trong `backend/src` và `backend/prisma/schema.prisma`.

- Local Base URL: `http://localhost:3000/api`
- Production Base URL: chưa thấy cấu hình domain thật trong repo, dùng placeholder khi triển khai: `https://<your-production-domain>/api`
- Xác thực REST: gửi header `Authorization: Bearer <accessToken>` cho API cần đăng nhập.
- API phiên thi của sinh viên còn cần header `X-Exam-Token: <session token>` sau khi gọi API bắt đầu thi.
- Response lỗi chung từ error handler:

```json
{
  "error": "Mô tả lỗi"
}
```

## Thuật ngữ

- Quản trị viên: tài khoản role `admin`.
- Giáo viên: tài khoản role `teacher`.
- Sinh viên: tài khoản role `student`.
- Mẫu đề thi: `exam_template`, chứa thông tin khuôn đề như lớp, tiêu đề, thời lượng, cấu hình trộn.
- Ca thi/đề thi cụ thể: `exam_instance`, được tạo từ mẫu đề thi, có thời gian bắt đầu/kết thúc, trạng thái công bố, danh sách câu hỏi và điểm từng câu.
- Phiên thi: `exam_session`, phiên làm bài của một sinh viên trong một ca thi.
- Bài làm: `submission`, kết quả nộp bài và điểm của một phiên thi.
- Giám sát: dữ liệu heartbeat, trạng thái phiên thi, cờ vi phạm trong `session_flag` và nhật ký trong `audit_log`.

## Danh sách endpoint active

### Auth / Đăng ký đăng nhập

### Gửi OTP đăng ký

- Method: POST
- Endpoint: `/api/auth/register-request`
- Quyền truy cập: Public
- Mô tả: Tạo bản ghi đăng ký chờ xác nhận và gửi OTP qua email.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "email": "student@example.com",
  "password": "Password123",
  "name": "Nguyễn Văn A",
  "role_name": "student"
}
```
- Response thành công:
```json
{
  "message": "OTP has been sent to your email"
}
```
- Response lỗi:
```json
{
  "error": "Missing required fields"
}
```
- Ghi chú: Có thể gửi `role_id` thay cho `role_name`; nếu không gửi role thì mặc định là `student`.

### Xác nhận OTP đăng ký

- Method: POST
- Endpoint: `/api/auth/register-confirm`
- Quyền truy cập: Public
- Mô tả: Xác nhận OTP và tạo tài khoản thật.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "email": "student@example.com",
  "otp": "123456"
}
```
- Response thành công:
```json
{
  "message": "User registered successfully",
  "user_id": "uuid"
}
```
- Response lỗi:
```json
{
  "error": "OTP invalid"
}
```
- Ghi chú: OTP hết hạn sau 5 phút, giới hạn 5 lần nhập sai.

### Đăng nhập

- Method: POST
- Endpoint: `/api/auth/login`
- Quyền truy cập: Public
- Mô tả: Đăng nhập bằng email/mật khẩu, trả access token và refresh token.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "email": "student@example.com",
  "password": "Password123"
}
```
- Response thành công:
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "name": "Nguyễn Văn A",
    "role_name": "student"
  },
  "token": "jwt",
  "refreshToken": "refresh-token"
}
```
- Response lỗi:
```json
{
  "error": "Thông tin đăng nhập không hợp lệ"
}
```
- Ghi chú: Tài khoản bị khóa (`is_active=false`) sẽ trả lỗi 403.

### Làm mới token

- Method: POST
- Endpoint: `/api/auth/refresh`
- Quyền truy cập: Public
- Mô tả: Kiểm tra refresh token, revoke token cũ và cấp cặp token mới.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "refreshToken": "refresh-token"
}
```
- Response thành công:
```json
{
  "user": {
    "id": "uuid",
    "email": "student@example.com"
  },
  "token": "new-jwt",
  "refreshToken": "new-refresh-token"
}
```
- Response lỗi:
```json
{
  "error": "Invalid or expired refresh token"
}
```
- Ghi chú: Refresh token được rotate sau mỗi lần gọi thành công.

### Đăng xuất

- Method: POST
- Endpoint: `/api/auth/logout`
- Quyền truy cập: Public
- Mô tả: Revoke refresh token.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "refreshToken": "refresh-token"
}
```
- Response thành công: HTTP 204, không có body.
- Response lỗi:
```json
{
  "error": "refreshToken required"
}
```
- Ghi chú: Endpoint không yêu cầu access token trong router hiện tại.

### Gửi OTP quên mật khẩu

- Method: POST
- Endpoint: `/api/auth/forgot-password`
- Quyền truy cập: Public
- Mô tả: Gửi OTP đặt lại mật khẩu tới email đã tồn tại.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "email": "student@example.com"
}
```
- Response thành công:
```json
{
  "message": "OTP has been sent to your email"
}
```
- Response lỗi:
```json
{
  "error": "Email not found"
}
```
- Ghi chú: OTP reset mật khẩu hết hạn sau 5 phút.

### Đặt lại mật khẩu bằng OTP

- Method: POST
- Endpoint: `/api/auth/reset-password`
- Quyền truy cập: Public
- Mô tả: Xác thực OTP và cập nhật mật khẩu mới.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "email": "student@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123"
}
```
- Response thành công:
```json
{
  "message": "Password reset successfully"
}
```
- Response lỗi:
```json
{
  "error": "OTP invalid or expired"
}
```
- Ghi chú: Sau khi đặt lại thành công, OTP được xóa khỏi user.

### Tìm kiếm lớp học theo tên

- Method: GET
- Endpoint: `/api/auth/classes/search`
- Quyền truy cập: Public
- Mô tả: Tìm lớp theo tên, dùng trước khi sinh viên gửi yêu cầu tham gia lớp.
- Params: Không có.
- Query: `name` bắt buộc.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "name": "Lớp CNTT",
    "code": "abc12345"
  }
]
```
- Response lỗi:
```json
{
  "error": "Vui lòng cung cấp tên lớp học để tìm kiếm"
}
```
- Ghi chú: Endpoint nằm trong `authRoutes`, không cần đăng nhập.

## User chung

### Lấy danh sách người dùng cơ bản

- Method: GET
- Endpoint: `/api/users`
- Quyền truy cập: Authenticated
- Mô tả: Lấy danh sách user cơ bản.
- Params: Không có.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
[
  {
    "name": "Nguyễn Văn A",
    "bio": "Thông tin cá nhân",
    "role_name": "student"
  }
]
```
- Response lỗi:
```json
{
  "error": "Không có quyền truy cập"
}
```
- Ghi chú: Route chỉ yêu cầu đăng nhập, không giới hạn role.

### Lấy thông tin người dùng hiện tại

- Method: GET
- Endpoint: `/api/users/me`
- Quyền truy cập: Authenticated
- Mô tả: Lấy profile của user đang đăng nhập.
- Params: Không có.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Nguyễn Văn A",
  "bio": "Thông tin cá nhân"
}
```
- Response lỗi:
```json
{
  "error": "Không có quyền truy cập"
}
```
- Ghi chú: Service `me` trả trực tiếp bản ghi user, có thể gồm `password_hash`.

### Tạo người dùng

- Method: POST
- Endpoint: `/api/users`
- Quyền truy cập: Authenticated
- Mô tả: Tạo user trực tiếp bằng `password_hash` và `role_id`.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "email": "user@example.com",
  "name": "Nguyễn Văn A",
  "password_hash": "hashed-password",
  "role_id": "uuid"
}
```
- Response thành công:
```json
{
  "id": "uuid",
  "email": "user@example.com"
}
```
- Response lỗi:
```json
{
  "error": "Không có quyền truy cập"
}
```
- Ghi chú: Endpoint đang active nhưng chỉ nên dùng nội bộ/admin; code hiện chưa gắn middleware role admin.

### Cập nhật profile hiện tại

- Method: PUT
- Endpoint: `/api/users/update`
- Quyền truy cập: Authenticated
- Mô tả: Cập nhật thông tin của user hiện tại.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "name": "Nguyễn Văn A",
  "bio": "Thông tin mới"
}
```
- Response thành công:
```json
{
  "message": "Cập nhật thông tin thành công"
}
```
- Response lỗi:
```json
{
  "error": "Không có quyền truy cập"
}
```
- Ghi chú: Service chặn cập nhật trực tiếp `role_id` và `email`.

### Đổi mật khẩu hiện tại

- Method: PUT
- Endpoint: `/api/users/update-password`
- Quyền truy cập: Authenticated
- Mô tả: Đổi mật khẩu bằng mật khẩu cũ.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "oldPassword": "Password123",
  "password": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```
- Response thành công:
```json
{
  "message": "Cập nhật mật khẩu thành công"
}
```
- Response lỗi:
```json
{
  "error": "Mật khẩu cũ không đúng"
}
```
- Ghi chú: `password` và `confirmPassword` phải trùng nhau.

### Lấy người dùng theo ID

- Method: GET
- Endpoint: `/api/users/:id`
- Quyền truy cập: Authenticated
- Mô tả: Lấy thông tin cơ bản của một user theo ID.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Nguyễn Văn A",
  "role_name": "student"
}
```
- Response lỗi:
```json
{
  "error": "Người dùng không tồn tại"
}
```
- Ghi chú: Không giới hạn role trong router hiện tại.

### Xóa người dùng theo ID

- Method: DELETE
- Endpoint: `/api/users/:id`
- Quyền truy cập: Authenticated
- Mô tả: Xóa cứng user theo ID.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công: HTTP 204, không có body.
- Response lỗi:
```json
{
  "error": "Không có quyền truy cập"
}
```
- Ghi chú: Endpoint đang active nhưng nguy hiểm; code hiện chưa gắn middleware role admin.

## Admin

### Lấy thống kê tổng quan

- Method: GET
- Endpoint: `/api/admin/statistics`
- Quyền truy cập: Admin
- Mô tả: Lấy thống kê tổng quan hệ thống.
- Params: Không có.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "totalUsers": 10,
  "totalClasses": 2,
  "totalExams": 3
}
```
- Response lỗi:
```json
{
  "error": "Chỉ dành cho quản trị viên"
}
```
- Ghi chú: Dữ liệu chi tiết lấy từ `adminService.getStatistics`.

### Lấy danh sách người dùng

- Method: GET
- Endpoint: `/api/admin/users`
- Quyền truy cập: Admin
- Mô tả: Lấy danh sách người dùng có phân trang và bộ lọc.
- Params: Không có.
- Query: `role`, `status=active|locked`, `search`, `page`, `limit`.
- Body: Không có.
- Response thành công:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "student@example.com",
      "role": "student",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```
- Response lỗi:
```json
{
  "error": "Chỉ dành cho quản trị viên"
}
```
- Ghi chú: Role là tên role trong bảng `auth_role`.

### Lấy chi tiết người dùng

- Method: GET
- Endpoint: `/api/admin/users/:id`
- Quyền truy cập: Admin
- Mô tả: Lấy thông tin chi tiết một người dùng.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "role": "student",
  "status": "active",
  "sessions": []
}
```
- Response lỗi:
```json
{
  "error": "User not found"
}
```
- Ghi chú: Response có thể gồm số lớp, số enrollment và refresh sessions.

### Khóa tài khoản người dùng

- Method: PUT
- Endpoint: `/api/admin/users/:id/lock`
- Quyền truy cập: Admin
- Mô tả: Chuyển `is_active=false`.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "id": "uuid",
  "status": "locked",
  "message": "User locked successfully"
}
```
- Response lỗi:
```json
{
  "error": "Không thể khóa chính tài khoản của bạn"
}
```
- Ghi chú: Ghi log admin action.

### Mở khóa tài khoản người dùng

- Method: PUT
- Endpoint: `/api/admin/users/:id/unlock`
- Quyền truy cập: Admin
- Mô tả: Chuyển `is_active=true`.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "id": "uuid",
  "status": "active",
  "message": "User unlocked successfully"
}
```
- Response lỗi:
```json
{
  "error": "User not found"
}
```
- Ghi chú: Ghi log admin action.

### Reset mật khẩu người dùng

- Method: POST
- Endpoint: `/api/admin/users/:id/reset-password`
- Quyền truy cập: Admin
- Mô tả: Đặt mật khẩu mới cho user.
- Params: `id`.
- Query: Không có.
- Body:
```json
{
  "password": "Password123"
}
```
- Response thành công:
```json
{
  "id": "uuid",
  "message": "Password reset successfully"
}
```
- Response lỗi:
```json
{
  "error": "Cannot reset your own password through admin panel. Use profile settings."
}
```
- Ghi chú: Nếu không gửi `password`, code dùng mặc định `"Password123"`.

### Lấy danh sách lớp học

- Method: GET
- Endpoint: `/api/admin/classes`
- Quyền truy cập: Admin
- Mô tả: Lấy danh sách lớp học.
- Params: Không có.
- Query: `search`, `status`, `page`, `limit`.
- Body: Không có.
- Response thành công:
```json
{
  "classes": [],
  "pagination": {
    "page": 1,
    "limit": 50
  }
}
```
- Response lỗi:
```json
{
  "error": "Chỉ dành cho quản trị viên"
}
```
- Ghi chú: Controller chưa truyền `includeDeleted` dù service có hỗ trợ tham số này.

### Lấy chi tiết lớp học

- Method: GET
- Endpoint: `/api/admin/classes/:id`
- Quyền truy cập: Admin
- Mô tả: Lấy chi tiết lớp, giáo viên và sinh viên đã duyệt.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "id": "uuid",
  "name": "Lớp CNTT",
  "teacher": {},
  "students": []
}
```
- Response lỗi:
```json
{
  "error": "Class not found"
}
```
- Ghi chú: Không có route admin restore class trong `adminRoutes.js`.

### Xóa lớp học

- Method: DELETE
- Endpoint: `/api/admin/classes/:id`
- Quyền truy cập: Admin
- Mô tả: Xóa mềm lớp học và ghi log admin.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Class deleted successfully"
}
```
- Response lỗi:
```json
{
  "error": "Class not found"
}
```
- Ghi chú: Service có hàm restore nhưng route restore chưa được mount.

### Lấy danh sách ca thi

- Method: GET
- Endpoint: `/api/admin/exams`
- Quyền truy cập: Admin
- Mô tả: Lấy danh sách exam instance toàn hệ thống.
- Params: Không có.
- Query: `status=upcoming|ongoing|ended|published|unpublished|suspended`, `search`, `page`, `limit`.
- Body: Không có.
- Response thành công:
```json
{
  "exams": [],
  "pagination": {
    "page": 1,
    "limit": 50
  }
}
```
- Response lỗi:
```json
{
  "error": "Chỉ dành cho quản trị viên"
}
```
- Ghi chú: `suspended` được normalize thành `unpublished` trong service.

### Lấy chi tiết ca thi

- Method: GET
- Endpoint: `/api/admin/exams/:id`
- Quyền truy cập: Admin
- Mô tả: Lấy chi tiết một exam instance, template, lớp, giáo viên, sessions và submissions.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "id": "uuid",
  "title": "Giữa kỳ",
  "status": "ongoing",
  "sessions": []
}
```
- Response lỗi:
```json
{
  "error": "Exam not found"
}
```
- Ghi chú: `:id` là ID của `exam_instance`.

### Lấy dashboard admin

- Method: GET
- Endpoint: `/api/admin/dashboard`
- Quyền truy cập: Admin
- Mô tả: Lấy số liệu dashboard tổng quan.
- Params: Không có.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "overview": {},
  "recentActivities": []
}
```
- Response lỗi:
```json
{
  "error": "Chỉ dành cho quản trị viên"
}
```
- Ghi chú: Dữ liệu từ `adminService.getDashboardStats`.

### Lấy lịch sử hoạt động admin

- Method: GET
- Endpoint: `/api/admin/activities`
- Quyền truy cập: Admin
- Mô tả: Lấy admin actions của admin hiện tại.
- Params: Không có.
- Query: `page`, `limit`, `actionType`.
- Body: Không có.
- Response thành công:
```json
{
  "activities": [],
  "pagination": {
    "page": 1,
    "limit": 50
  }
}
```
- Response lỗi:
```json
{
  "error": "Chỉ dành cho quản trị viên"
}
```
- Ghi chú: Lọc theo `actionType` nếu có.

### Xuất danh sách sinh viên CSV

- Method: GET
- Endpoint: `/api/admin/export/students`
- Quyền truy cập: Admin
- Mô tả: Xuất danh sách sinh viên ra file CSV.
- Params: Không có.
- Query: `classId`, `status=active|locked`.
- Body: Không có.
- Response thành công: `text/csv; charset=utf-8`.
- Response lỗi:
```json
{
  "error": "Chỉ dành cho quản trị viên"
}
```
- Ghi chú: Response có header `Content-Disposition` để tải file.

### Xuất kết quả thi CSV

- Method: GET
- Endpoint: `/api/admin/export/results/:examId`
- Quyền truy cập: Admin
- Mô tả: Xuất kết quả thi của một exam instance.
- Params: `examId`.
- Query: Không có.
- Body: Không có.
- Response thành công: `text/csv; charset=utf-8`.
- Response lỗi:
```json
{
  "error": "Exam not found"
}
```
- Ghi chú: `examId` là ID của `exam_instance`.

### Xuất nhật ký thi CSV

- Method: GET
- Endpoint: `/api/admin/export/logs/:examId`
- Quyền truy cập: Admin
- Mô tả: Xuất audit log của một exam instance.
- Params: `examId`.
- Query: Không có.
- Body: Không có.
- Response thành công: `text/csv; charset=utf-8`.
- Response lỗi:
```json
{
  "error": "Exam not found"
}
```
- Ghi chú: File CSV có BOM để Excel đọc UTF-8.

## Teacher

### Tạo lớp học

- Method: POST
- Endpoint: `/api/teacher/classes`
- Quyền truy cập: Teacher
- Mô tả: Tạo lớp học mới cho giáo viên hiện tại.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "name": "Lớp CNTT",
  "description": "Mô tả lớp"
}
```
- Response thành công:
```json
{
  "newClass": {
    "id": "uuid",
    "code": "abc12345"
  },
  "message": "Lớp học đã được tạo thành công"
}
```
- Response lỗi:
```json
{
  "error": "Tạo lớp học thất bại"
}
```
- Ghi chú: Mã lớp được sinh tự động 8 ký tự.

### Lấy danh sách lớp của giáo viên

- Method: GET
- Endpoint: `/api/teacher/classes`
- Quyền truy cập: Teacher
- Mô tả: Lấy các lớp do giáo viên hiện tại tạo.
- Params: Không có.
- Query: `includeDeleted=true|false`.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "name": "Lớp CNTT",
    "code": "abc12345"
  }
]
```
- Response lỗi:
```json
{
  "error": "Lấy danh sách lớp học thất bại"
}
```
- Ghi chú: Middleware teacher cho phép cả role `teacher` và `admin`.

### Lấy chi tiết lớp học

- Method: GET
- Endpoint: `/api/teacher/classes/:id`
- Quyền truy cập: Teacher
- Mô tả: Lấy thông tin lớp và danh sách sinh viên đã duyệt.
- Params: `id`.
- Query: `includeDeleted=true|false`.
- Body: Không có.
- Response thành công:
```json
{
  "classInfo": {},
  "listStudent": []
}
```
- Response lỗi:
```json
{
  "error": "Lấy thông tin lớp học thất bại"
}
```
- Ghi chú: Controller bổ sung `studentInfo` cho từng sinh viên.

### Cập nhật lớp học

- Method: PUT
- Endpoint: `/api/teacher/classes/:id`
- Quyền truy cập: Teacher
- Mô tả: Cập nhật thông tin lớp.
- Params: `id`.
- Query: Không có.
- Body:
```json
{
  "name": "Tên lớp mới",
  "description": "Mô tả mới"
}
```
- Response thành công:
```json
{
  "updatedClass": {},
  "message": "Cập nhật lớp học thành công"
}
```
- Response lỗi:
```json
{
  "error": "Cập nhật thất bại"
}
```
- Ghi chú: Route không có endpoint restore class.

### Xóa lớp học

- Method: DELETE
- Endpoint: `/api/teacher/classes/:id`
- Quyền truy cập: Teacher
- Mô tả: Xóa mềm lớp học của giáo viên.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Xóa lớp học thành công"
}
```
- Response lỗi:
```json
{
  "error": "Xóa lớp học thất bại"
}
```
- Ghi chú: Service cascade soft-delete template và exam instance liên quan.

### Thêm sinh viên vào lớp bằng email

- Method: POST
- Endpoint: `/api/teacher/classes/:classId/students`
- Quyền truy cập: Teacher
- Mô tả: Thêm trực tiếp sinh viên vào lớp bằng email.
- Params: `classId`.
- Query: Không có.
- Body:
```json
{
  "email": "student@example.com"
}
```
- Response thành công:
```json
{
  "enrollment": {},
  "message": "Thêm sinh viên vào lớp thành công"
}
```
- Response lỗi:
```json
{
  "error": "Chỉ giáo viên mới được thêm sinh viên vào lớp"
}
```
- Ghi chú: Trong controller, role phải đúng `teacher`, admin không được dùng endpoint này.

### Preview import danh sách sinh viên

- Method: POST
- Endpoint: `/api/teacher/classes/:classId/students/import/preview`
- Quyền truy cập: Teacher
- Mô tả: Đọc file danh sách sinh viên và trả kết quả kiểm tra email.
- Params: `classId`.
- Query: Không có.
- Body: `multipart/form-data`, field file là `file`.
- Upload file: `.csv`, `.txt`, `.xlsx`, `.xls`, `.docx`, tối đa 10MB.
- Response thành công:
```json
{
  "total": 3,
  "items": []
}
```
- Response lỗi:
```json
{
  "error": "Vui lòng chọn file danh sách sinh viên"
}
```
- Ghi chú: Endpoint chỉ preview, chưa ghi dữ liệu lớp.

### Xác nhận import danh sách sinh viên

- Method: POST
- Endpoint: `/api/teacher/classes/:classId/students/import/confirm`
- Quyền truy cập: Teacher
- Mô tả: Thêm hàng loạt sinh viên vào lớp từ danh sách email đã preview.
- Params: `classId`.
- Query: Không có.
- Body:
```json
{
  "emails": ["student1@example.com", "student2@example.com"]
}
```
- Response thành công:
```json
{
  "addedCount": 2,
  "skippedCount": 0,
  "skipped": []
}
```
- Response lỗi:
```json
{
  "error": "Danh sách email không hợp lệ"
}
```
- Ghi chú: Email không hợp lệ/trùng/không phải sinh viên sẽ nằm trong `skipped`.

### Xóa sinh viên khỏi lớp

- Method: DELETE
- Endpoint: `/api/teacher/classes/:classId/students/:studentId`
- Quyền truy cập: Teacher
- Mô tả: Xóa enrollment đã duyệt của sinh viên khỏi lớp.
- Params: `classId`, `studentId`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Xóa sinh viên khỏi lớp học thành công"
}
```
- Response lỗi:
```json
{
  "error": "Xóa sinh viên khỏi lớp học thất bại"
}
```
- Ghi chú: Chỉ giáo viên sở hữu lớp được thao tác.

### Lấy yêu cầu tham gia lớp

- Method: GET
- Endpoint: `/api/teacher/classes/:id/enrollment-requests`
- Quyền truy cập: Teacher
- Mô tả: Lấy danh sách yêu cầu pending của lớp.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "status": "pending",
    "student": {}
  }
]
```
- Response lỗi:
```json
{
  "error": "Lấy danh sách yêu cầu tham gia lớp học thất bại"
}
```
- Ghi chú: Chỉ trả yêu cầu có trạng thái `pending`.

### Duyệt hoặc từ chối yêu cầu tham gia lớp

- Method: POST
- Endpoint: `/api/teacher/enrollment-requests/approve`
- Quyền truy cập: Teacher
- Mô tả: Cập nhật trạng thái yêu cầu tham gia lớp.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "requestId": "uuid",
  "status": "approved"
}
```
- Response thành công:
```json
{
  "message": "Cập nhật trạng thái yêu cầu thành công"
}
```
- Response lỗi:
```json
{
  "error": "Trạng thái không hợp lệ"
}
```
- Ghi chú: `status` chỉ nhận `approved` hoặc `rejected`.

### Tạo câu hỏi

- Method: POST
- Endpoint: `/api/teacher/questions`
- Quyền truy cập: Teacher
- Mô tả: Tạo câu hỏi trong ngân hàng câu hỏi của giáo viên.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "text": "2 + 2 = ?",
  "type": "SINGLE_CHOICE",
  "explanation": "Cộng cơ bản",
  "tags": ["math"],
  "difficulty": "easy",
  "choices": [
    { "text": "4", "is_correct": true },
    { "text": "5", "is_correct": false }
  ]
}
```
- Response thành công:
```json
{
  "newQuestion": {},
  "message": "Câu hỏi đã được thêm thành công"
}
```
- Response lỗi:
```json
{
  "error": "Nội dung câu hỏi là bắt buộc"
}
```
- Ghi chú: `type` nhận `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `FILL_IN_THE_BLANK`. Với điền khuyết dùng `correct_text_answer`.

### Lấy danh sách câu hỏi

- Method: GET
- Endpoint: `/api/teacher/questions`
- Quyền truy cập: Teacher
- Mô tả: Lấy danh sách câu hỏi của giáo viên.
- Params: Không có.
- Query: Không có trong controller hiện tại.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "text": "Nội dung câu hỏi",
    "question_choice": []
  }
]
```
- Response lỗi:
```json
{
  "error": "Lấy danh sách câu hỏi thất bại"
}
```
- Ghi chú: Service hỗ trợ `includeDeleted`, nhưng controller chưa đọc query này.

### Cập nhật câu hỏi

- Method: PUT
- Endpoint: `/api/teacher/questions/:id`
- Quyền truy cập: Teacher
- Mô tả: Cập nhật câu hỏi và lựa chọn.
- Params: `id`.
- Query: Không có.
- Body:
```json
{
  "text": "Nội dung mới",
  "type": "MULTIPLE_CHOICE",
  "choices": [
    { "text": "A", "is_correct": true },
    { "text": "B", "is_correct": true }
  ]
}
```
- Response thành công:
```json
{
  "updatedQuestion": {},
  "message": "Cập nhật câu hỏi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Loại câu hỏi không hợp lệ"
}
```
- Ghi chú: Nếu cập nhật `choices`, danh sách phải có ít nhất 2 lựa chọn và ít nhất một đáp án đúng.

### Xóa câu hỏi

- Method: DELETE
- Endpoint: `/api/teacher/questions/:id`
- Quyền truy cập: Teacher
- Mô tả: Xóa mềm câu hỏi.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Xóa câu hỏi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Xóa câu hỏi thất bại"
}
```
- Ghi chú: Service dọn media import không còn dùng nếu có.

### Khôi phục câu hỏi

- Method: PUT
- Endpoint: `/api/teacher/questions/:id/restore`
- Quyền truy cập: Teacher
- Mô tả: Khôi phục câu hỏi đã xóa mềm.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Khôi phục câu hỏi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Khôi phục câu hỏi thất bại"
}
```
- Ghi chú: Route active trong `teacherRoutes.js`.

### Lấy chi tiết câu hỏi

- Method: GET
- Endpoint: `/api/teacher/questions/:id`
- Quyền truy cập: Teacher
- Mô tả: Lấy chi tiết câu hỏi theo ID.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "id": "uuid",
  "text": "Nội dung câu hỏi",
  "question_choice": []
}
```
- Response lỗi:
```json
{
  "error": "Lấy chi tiết câu hỏi thất bại"
}
```
- Ghi chú: Controller gọi `getQuestionById(questionId)` không truyền `teacherId`; cần kiểm tra phân quyền chi tiết nếu cần siết.

### Tạo mẫu đề thi

- Method: POST
- Endpoint: `/api/teacher/exam-templates`
- Quyền truy cập: Teacher
- Mô tả: Tạo mẫu đề thi cho một lớp.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "title": "Mẫu đề giữa kỳ",
  "description": "Mô tả",
  "class_id": "uuid",
  "duration_seconds": 3600,
  "shuffle_questions": true,
  "shuffle_choices": true,
  "passing_score": 5
}
```
- Response thành công:
```json
{
  "newTemplate": {},
  "message": "Mẫu đề thi đã được tạo thành công"
}
```
- Response lỗi:
```json
{
  "error": "Tạo mẫu đề thi thất bại"
}
```
- Ghi chú: Controller kiểm tra lớp thuộc giáo viên hiện tại.

### Lấy danh sách mẫu đề thi của giáo viên

- Method: GET
- Endpoint: `/api/teacher/exam-templates`
- Quyền truy cập: Teacher
- Mô tả: Lấy danh sách mẫu đề thi do giáo viên tạo.
- Params: Không có.
- Query: `includeDeleted=true|false`.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "title": "Mẫu đề giữa kỳ"
  }
]
```
- Response lỗi:
```json
{
  "error": "Lấy danh sách mẫu đề thi thất bại"
}
```
- Ghi chú: `includeDeleted=true` cho phép xem mẫu đã xóa mềm.

### Cập nhật mẫu đề thi

- Method: PUT
- Endpoint: `/api/teacher/exam-templates/:id`
- Quyền truy cập: Teacher
- Mô tả: Cập nhật mẫu đề thi.
- Params: `id`.
- Query: Không có.
- Body:
```json
{
  "title": "Tên mới",
  "duration_seconds": 4500,
  "shuffle_questions": false,
  "shuffle_choices": true,
  "passing_score": 6
}
```
- Response thành công:
```json
{
  "updatedTemplate": {},
  "message": "Cập nhật mẫu đề thi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Cập nhật mẫu đề thi thất bại"
}
```
- Ghi chú: Boolean dạng string `"true"`/`"false"` được convert.

### Xóa mẫu đề thi

- Method: DELETE
- Endpoint: `/api/teacher/exam-templates/:id`
- Quyền truy cập: Teacher
- Mô tả: Xóa mềm mẫu đề thi.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Xóa mẫu đề thi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Xóa mẫu đề thi thất bại: Không được xóa mẫu đề thi đã có đề thi được tạo từ nó"
}
```
- Ghi chú: Controller hiện có gọi `res.json` rồi `res.status(200).end()`, nhưng response thực tế là JSON đầu tiên.

### Khôi phục mẫu đề thi

- Method: PUT
- Endpoint: `/api/teacher/exam-templates/:id/restore`
- Quyền truy cập: Teacher
- Mô tả: Khôi phục mẫu đề thi đã xóa mềm.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Khôi phục mẫu đề thi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Khôi phục mẫu đề thi thất bại"
}
```
- Ghi chú: Route active.

### Tìm kiếm mẫu đề thi

- Method: GET
- Endpoint: `/api/teacher/exam-templates/search`
- Quyền truy cập: Teacher
- Mô tả: Tìm mẫu đề thi theo từ khóa.
- Params: Không có.
- Query: `keyword`.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "title": "Mẫu đề giữa kỳ"
  }
]
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Nếu không gửi keyword, code dùng chuỗi rỗng.

### Lấy chi tiết mẫu đề thi

- Method: GET
- Endpoint: `/api/teacher/exam-templates/:id`
- Quyền truy cập: Teacher
- Mô tả: Lấy mẫu đề thi theo ID.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "id": "uuid",
  "title": "Mẫu đề giữa kỳ"
}
```
- Response lỗi:
```json
{
  "error": "Mẫu đề thi không tồn tại hoặc bạn không có quyền truy cập"
}
```
- Ghi chú: Route `/search` được khai báo trước `/:id`, không bị nuốt bởi dynamic route.

### Tạo ca thi

- Method: POST
- Endpoint: `/api/teacher/exam-instances`
- Quyền truy cập: Teacher
- Mô tả: Tạo ca thi/đề thi cụ thể từ mẫu đề thi.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "templateId": "uuid",
  "title": "Ca thi giữa kỳ",
  "starts_at": "2026-07-01T08:00:00.000Z",
  "ends_at": "2026-07-01T09:00:00.000Z",
  "published": false,
  "show_answers": false,
  "scoring_mode": "ALL_OR_NOTHING",
  "questions": [
    { "question_id": "uuid", "points": 1 }
  ]
}
```
- Response thành công:
```json
{
  "newInstance": {},
  "message": "Đề thi đã được tạo thành công"
}
```
- Response lỗi:
```json
{
  "error": "Đề thi phải có ít nhất 1 câu hỏi"
}
```
- Ghi chú: `starts_at` phải là tương lai và nhỏ hơn `ends_at`; `scoring_mode` nhận `ALL_OR_NOTHING` hoặc `PARTIAL_WITH_PENALTY`.

### Xóa ca thi

- Method: DELETE
- Endpoint: `/api/teacher/exam-instances/:id`
- Quyền truy cập: Teacher
- Mô tả: Xóa mềm ca thi.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Xóa đề thi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Xóa đề thi thất bại"
}
```
- Ghi chú: `id` là ID của `exam_instance`.

### Khôi phục ca thi

- Method: PUT
- Endpoint: `/api/teacher/exam-instances/:id/restore`
- Quyền truy cập: Teacher
- Mô tả: Khôi phục ca thi đã xóa mềm.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Khôi phục đề thi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Khôi phục đề thi thất bại"
}
```
- Ghi chú: Route active.

### Lấy ca thi theo mẫu đề

- Method: GET
- Endpoint: `/api/teacher/exam-templates/:templateId/exam-instances`
- Quyền truy cập: Teacher
- Mô tả: Lấy danh sách ca thi thuộc một mẫu đề.
- Params: `templateId`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "title": "Ca thi giữa kỳ"
  }
]
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Giáo viên phải có quyền với template.

### Cập nhật ca thi

- Method: PUT
- Endpoint: `/api/teacher/exam-instances/:id`
- Quyền truy cập: Teacher
- Mô tả: Cập nhật thông tin ca thi và danh sách câu hỏi nếu phiên thi chưa bắt đầu.
- Params: `id`.
- Query: Không có.
- Body:
```json
{
  "title": "Ca thi mới",
  "starts_at": "2026-07-01T08:00:00.000Z",
  "ends_at": "2026-07-01T09:00:00.000Z",
  "published": true,
  "show_answers": false,
  "scoring_mode": "PARTIAL_WITH_PENALTY",
  "questions": [
    { "question_id": "uuid", "points": 2 }
  ]
}
```
- Response thành công:
```json
{
  "updatedInstance": {},
  "message": "Cập nhật đề thi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Danh sách câu hỏi không hợp lệ"
}
```
- Ghi chú: Không được cập nhật câu hỏi nếu đã có session bắt đầu.

### Lấy chi tiết ca thi

- Method: GET
- Endpoint: `/api/teacher/exam-instances/:id`
- Quyền truy cập: Teacher
- Mô tả: Lấy chi tiết ca thi theo ID.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "id": "uuid",
  "title": "Ca thi giữa kỳ",
  "exam_question": []
}
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: `id` là `exam_instance.id`.

### Xuất nhiều mã đề đã trộn

- Method: POST
- Endpoint: `/api/teacher/exams/:id/export-variants`
- Quyền truy cập: Teacher
- Mô tả: Xuất một hoặc nhiều biến thể đề thi dạng DOCX/PDF/ZIP, có thể kèm CSV đáp án.
- Params: `id` là `exam_instance.id`.
- Query: Không có.
- Body:
```json
{
  "format": "docx",
  "variantCount": 3,
  "includeAnswerCsv": true
}
```
- Response thành công: File binary với `Content-Type` tương ứng.
- Response lỗi:
```json
{
  "error": "Định dạng không hợp lệ"
}
```
- Ghi chú: `format` nhận `docx`, `doc`, `pdf`; `variantCount` bị giới hạn 1-50. Với nhiều biến thể hoặc kèm đáp án sẽ trả ZIP.

### Tìm sinh viên trong lớp

- Method: GET
- Endpoint: `/api/teacher/classes/:classId/students`
- Quyền truy cập: Teacher
- Mô tả: Tìm sinh viên đã được duyệt trong lớp theo từ khóa.
- Params: `classId`.
- Query: `keyword`.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "email": "student@example.com",
    "name": "Nguyễn Văn A"
  }
]
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Tài liệu cũ ghi nhầm method PUT và dư dấu `/`.

### Công bố ca thi

- Method: POST
- Endpoint: `/api/teacher/exam-instances/:id/publish`
- Quyền truy cập: Teacher
- Mô tả: Đặt `published=true` cho ca thi.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Công bố đề thi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Sau khi publish, sinh viên mới thấy ca thi nếu thuộc lớp và trong danh sách đã duyệt.

### Hủy công bố ca thi

- Method: POST
- Endpoint: `/api/teacher/exam-instances/:id/unpublish`
- Quyền truy cập: Teacher
- Mô tả: Đặt `published=false` cho ca thi.
- Params: `id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "message": "Hủy công bố đề thi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Không xóa dữ liệu ca thi.

### Cộng hoặc đặt thêm thời gian cho sinh viên

- Method: POST
- Endpoint: `/api/teacher/exam-instances/:id/accommodations`
- Quyền truy cập: Teacher
- Mô tả: Tạo/cập nhật thời gian cộng thêm cho một sinh viên trong ca thi.
- Params: `id` là `exam_instance.id`.
- Query: Không có.
- Body:
```json
{
  "student_id": "uuid",
  "extra_seconds": 600,
  "notes": "Gia hạn 10 phút"
}
```
- Response thành công:
```json
{
  "accommodation": {},
  "message": "Cập nhật thêm thời gian thành công"
}
```
- Response lỗi:
```json
{
  "error": "Cần cung cấp extra_seconds (tuyệt đối) hoặc add_seconds (cộng dồn)"
}
```
- Ghi chú: Có thể dùng `add_seconds` để cộng dồn; nếu session đang thi có thể broadcast qua Socket.IO.

### Lấy sinh viên đang thi trong lớp

- Method: GET
- Endpoint: `/api/teacher/classes/:classId/active-students`
- Quyền truy cập: Teacher
- Mô tả: Lấy danh sách sinh viên có phiên thi `started` trong lớp.
- Params: `classId`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
[
  {
    "student": {},
    "session": {}
  }
]
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Dùng cho màn hình giám sát nhanh.

### Lấy danh sách cờ vi phạm theo ca thi

- Method: GET
- Endpoint: `/api/teacher/classes/:examInstanceId/flags`
- Quyền truy cập: Teacher
- Mô tả: Lấy danh sách session flag của một ca thi.
- Params: `examInstanceId`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
[
  {
    "flag_type": "focus_lost_threshold",
    "details": {},
    "student": {}
  }
]
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Tên route có prefix `classes` nhưng param thực tế là `examInstanceId`; cần cân nhắc đổi route trong tương lai nếu muốn rõ nghĩa hơn.

### Khóa thủ công phiên thi

- Method: POST
- Endpoint: `/api/teacher/exam-sessions/:id/lock`
- Quyền truy cập: Teacher
- Mô tả: Chuyển phiên thi sang `locked`.
- Params: `id` là `exam_session.id`.
- Query: Không có.
- Body:
```json
{
  "reason": "Phát hiện vi phạm"
}
```
- Response thành công:
```json
{
  "session": {},
  "message": "Khóa phiên thi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Tạo cờ `manual_lock`.

### Mở khóa thủ công phiên thi

- Method: POST
- Endpoint: `/api/teacher/exam-sessions/:id/unlock`
- Quyền truy cập: Teacher
- Mô tả: Mở khóa phiên thi.
- Params: `id` là `exam_session.id`.
- Query: Không có.
- Body:
```json
{
  "reason": "Cho phép tiếp tục"
}
```
- Response thành công:
```json
{
  "session": {},
  "message": "Mở khóa phiên thi thành công"
}
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Tạo cờ `manual_unlock`.

### Lấy ca thi của một lớp

- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-instances`
- Quyền truy cập: Teacher
- Mô tả: Lấy tất cả exam instance thuộc lớp.
- Params: `classId`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "title": "Ca thi giữa kỳ"
  }
]
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Giáo viên phải sở hữu lớp.

### Lấy dữ liệu giám sát ca thi theo lớp

- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-instances/:examInstanceId/monitor`
- Quyền truy cập: Teacher
- Mô tả: Lấy dữ liệu tổng hợp cho trang giám sát.
- Params: `classId`, `examInstanceId`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "summary": {
    "notStarted": 0,
    "inProgress": 0,
    "submitted": 0,
    "locked": 0,
    "flagged": 0
  },
  "students": [],
  "flags": []
}
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Response gồm trạng thái online/offline, progress và flags.

### Lấy tiến độ làm bài theo lớp

- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-instances/:examInstanceId/progress`
- Quyền truy cập: Teacher
- Mô tả: Lấy tiến độ làm bài của sinh viên trong lớp.
- Params: `classId`, `examInstanceId`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "not_started": [],
  "in_progress": [],
  "submitted": []
}
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Dùng cho báo cáo/giám sát tiến độ.

### Lấy dashboard giáo viên

- Method: GET
- Endpoint: `/api/teacher/dashboard`
- Quyền truy cập: Teacher
- Mô tả: Lấy thống kê dashboard của giáo viên hiện tại.
- Params: Không có.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "summary": {},
  "recentClasses": [],
  "recentExams": []
}
```
- Response lỗi:
```json
{
  "error": "Lấy thông tin dashboard thất bại"
}
```
- Ghi chú: Dữ liệu từ `teacherService.getDashboardStats`.

### Xuất sinh viên trong lớp CSV

- Method: GET
- Endpoint: `/api/teacher/export/students/:classId`
- Quyền truy cập: Teacher
- Mô tả: Xuất danh sách sinh viên của lớp ra CSV.
- Params: `classId`.
- Query: Không có.
- Body: Không có.
- Response thành công: `text/csv; charset=utf-8`.
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Có header tải file.

### Xuất kết quả thi CSV

- Method: GET
- Endpoint: `/api/teacher/export/results/:examId`
- Quyền truy cập: Teacher
- Mô tả: Xuất kết quả của một ca thi.
- Params: `examId` là `exam_instance.id`.
- Query: Không có.
- Body: Không có.
- Response thành công: `text/csv; charset=utf-8`.
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Chỉ giáo viên sở hữu ca thi được xuất.

### Xuất nhật ký thi CSV

- Method: GET
- Endpoint: `/api/teacher/export/logs/:examId`
- Quyền truy cập: Teacher
- Mô tả: Xuất audit log của một ca thi.
- Params: `examId` là `exam_instance.id`.
- Query: Không có.
- Body: Không có.
- Response thành công: `text/csv; charset=utf-8`.
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Chỉ giáo viên sở hữu ca thi được xuất.

### Lấy điểm sinh viên trong lớp theo ca thi

- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-instances/:examInstanceId/scores`
- Quyền truy cập: Teacher
- Mô tả: Lấy danh sách điểm của sinh viên trong lớp ở một ca thi.
- Params: `classId`, `examInstanceId`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
[
  {
    "student": {},
    "score": 8,
    "max_score": 10
  }
]
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Dùng cho trang điểm/báo cáo.

### Lấy mẫu đề thi theo lớp

- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-templates`
- Quyền truy cập: Teacher
- Mô tả: Lấy danh sách mẫu đề thi của một lớp.
- Params: `classId`.
- Query: `includeDeleted=true|false`.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "title": "Mẫu đề giữa kỳ"
  }
]
```
- Response lỗi:
```json
{
  "error": "Mô tả lỗi"
}
```
- Ghi chú: Có thể xem mẫu đã xóa bằng `includeDeleted=true`.

### Preview import câu hỏi từ file đề

- Method: POST
- Endpoint: `/api/teacher/questions/import/preview`
- Quyền truy cập: Teacher
- Mô tả: Đọc file DOCX/PDF và preview danh sách câu hỏi parse được.
- Params: Không có.
- Query: Không có.
- Body: `multipart/form-data`, field file là `file`.
- Upload file: `.docx`, `.pdf`, tối đa 20MB.
- Response thành công:
```json
{
  "success": true,
  "data": {
    "total": 10,
    "questions": [],
    "mediaUrls": []
  }
}
```
- Response lỗi:
```json
{
  "success": false,
  "message": "Không tìm thấy file upload"
}
```
- Ghi chú: Ảnh import tạm có thể được phục vụ qua `/api/media/imported/...`.

### Xác nhận import câu hỏi

- Method: POST
- Endpoint: `/api/teacher/questions/import/confirm`
- Quyền truy cập: Teacher
- Mô tả: Lưu các câu hỏi đã preview vào ngân hàng câu hỏi.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "questions": [
    {
      "text": "Nội dung câu hỏi",
      "type": "SINGLE_CHOICE",
      "choices": [
        { "text": "A", "is_correct": true },
        { "text": "B", "is_correct": false }
      ]
    }
  ]
}
```
- Response thành công:
```json
{
  "message": "Thêm câu hỏi thành công",
  "totalImported": 1,
  "questions": []
}
```
- Response lỗi:
```json
{
  "success": false,
  "error": "Danh sách câu hỏi không hợp lệ"
}
```
- Ghi chú: Teacher ID lấy từ access token.

### Dọn media import tạm

- Method: POST
- Endpoint: `/api/teacher/questions/import/cleanup-media`
- Quyền truy cập: Teacher
- Mô tả: Xóa các media preview không còn dùng.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "mediaUrls": ["/api/media/imported/path/to/image.png"]
}
```
- Response thành công:
```json
{
  "success": true,
  "deleted": 1
}
```
- Response lỗi:
```json
{
  "success": false,
  "error": "Khong the don dep anh import"
}
```
- Ghi chú: Chỉ xóa media không còn được tham chiếu trong câu hỏi.

## Student

### Gửi yêu cầu tham gia lớp

- Method: POST
- Endpoint: `/api/student/enroll`
- Quyền truy cập: Student
- Mô tả: Sinh viên gửi yêu cầu tham gia lớp bằng mã lớp.
- Params: Không có.
- Query: Không có.
- Body:
```json
{
  "classCode": "abc12345",
  "note": "Em xin tham gia lớp"
}
```
- Response thành công:
```json
{
  "enrollmentRequest": {},
  "message": "Yêu cầu tham gia lớp học đã được gửi"
}
```
- Response lỗi:
```json
{
  "error": "Tham gia lớp học thất bại: Lớp học không tồn tại"
}
```
- Ghi chú: Tạo trạng thái `pending`, giáo viên cần duyệt.

### Lấy danh sách lớp đã tham gia

- Method: GET
- Endpoint: `/api/student/classes`
- Quyền truy cập: Student
- Mô tả: Lấy các lớp của sinh viên theo trạng thái enrollment.
- Params: Không có.
- Query: `status=pending|approved` bắt buộc theo service.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "name": "Lớp CNTT"
  }
]
```
- Response lỗi:
```json
{
  "error": "Trạng thái không hợp lệ"
}
```
- Ghi chú: Nếu không gửi status, service hiện trả lỗi.

### Rời lớp học

- Method: DELETE
- Endpoint: `/api/student/classes/:id`
- Quyền truy cập: Student
- Mô tả: Xóa enrollment `approved` của sinh viên khỏi lớp.
- Params: `id` là class ID.
- Query: Không có.
- Body: Không có.
- Response thành công: HTTP 204, không có body.
- Response lỗi:
```json
{
  "error": "Rời lớp học thất bại"
}
```
- Ghi chú: Chỉ xóa yêu cầu đã được duyệt.

### Lấy ca thi theo lớp

- Method: GET
- Endpoint: `/api/student/exams/classes/:id`
- Quyền truy cập: Student
- Mô tả: Lấy danh sách ca thi đã công bố của lớp mà sinh viên đã được duyệt.
- Params: `id` là class ID.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "title": "Ca thi giữa kỳ",
    "status": "ongoing",
    "session_state": null,
    "submitted": false
  }
]
```
- Response lỗi:
```json
{
  "error": "Lấy danh sách đề thi thất bại: Sinh viên không tham gia lớp học này"
}
```
- Ghi chú: Chỉ trả ca thi `published=true` và chưa bị xóa.

### Lấy tổng quan bài thi

- Method: GET
- Endpoint: `/api/student/exams/overview`
- Quyền truy cập: Student
- Mô tả: Lấy tất cả ca thi đã công bố trong các lớp đã duyệt và thống kê kết quả.
- Params: Không có.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "exams": [],
  "summary": {
    "completedCount": 0,
    "notAttemptedCount": 0,
    "upcomingCount": 0,
    "averageScore": 0
  }
}
```
- Response lỗi:
```json
{
  "error": "Lấy tổng quan bài thi thất bại: Mô tả lỗi"
}
```
- Ghi chú: Điểm chuẩn hóa được tính theo thang 10 trong service.

### Bắt đầu ca thi

- Method: POST
- Endpoint: `/api/student/exams/:id/start`
- Quyền truy cập: Student
- Mô tả: Tạo hoặc resume phiên thi cho ca thi đang mở.
- Params: `id` là `exam_instance.id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "session_id": "uuid",
  "token": "session-token",
  "started_at": "2026-07-01T08:00:00.000Z",
  "ends_at": "2026-07-01T09:00:00.000Z",
  "duration_seconds": 3600,
  "state": "started",
  "questions": []
}
```
- Response lỗi:
```json
{
  "error": "Bắt đầu kỳ thi thất bại: Đề thi không nằm trong khung thời gian cho phép"
}
```
- Ghi chú: Lưu IP/User-Agent, sinh `exam_session.token`; client phải dùng token này ở header `X-Exam-Token`.

### Hủy yêu cầu tham gia lớp

- Method: POST
- Endpoint: `/api/student/classes/:id/cancel-enrollment`
- Quyền truy cập: Student
- Mô tả: Hủy yêu cầu tham gia lớp đang pending.
- Params: `id` là class ID.
- Query: Không có.
- Body: Không có.
- Response thành công: HTTP 204, không có body.
- Response lỗi:
```json
{
  "error": "Hủy yêu cầu tham gia lớp học thất bại: Mô tả lỗi"
}
```
- Ghi chú: Service cập nhật trạng thái hoặc xóa tùy logic hiện tại.

### Lấy câu hỏi trong phiên thi

- Method: GET
- Endpoint: `/api/student/sessions/:id/questions`
- Quyền truy cập: Student + `X-Exam-Token`
- Mô tả: Lấy danh sách câu hỏi theo thứ tự đã lưu trong phiên thi.
- Params: `id` là `exam_session.id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
[
  {
    "id": "uuid",
    "text": "Câu hỏi",
    "type": "SINGLE_CHOICE",
    "choices": [],
    "selected_choice_ids": []
  }
]
```
- Response lỗi:
```json
{
  "error": "Thieu token phien lam bai (X-Exam-Token)"
}
```
- Ghi chú: Middleware kiểm tra session token, owner, trạng thái `started`, IP/User-Agent.

### Heartbeat phiên thi

- Method: POST
- Endpoint: `/api/student/sessions/:id/heartbeat`
- Quyền truy cập: Student + `X-Exam-Token`
- Mô tả: Cập nhật heartbeat, ghi nhận mất focus/chuyển tab.
- Params: `id` là `exam_session.id`.
- Query: Không có.
- Body:
```json
{
  "focusLost": true
}
```
- Response thành công:
```json
{
  "state": "started",
  "focus_lost_count": 1,
  "locked": false
}
```
- Response lỗi:
```json
{
  "error": "Heartbeat thất bại: Phiên làm bài không ở trạng thái đang diễn ra"
}
```
- Ghi chú: Nếu vượt `EXAM_FOCUS_LOST_THRESHOLD`, phiên bị khóa và tạo flag `focus_lost_threshold`.

### Lưu đáp án

- Method: POST
- Endpoint: `/api/student/sessions/:id/answers`
- Quyền truy cập: Student + `X-Exam-Token`
- Mô tả: Lưu hoặc ghi đè đáp án của một câu hỏi trong phiên.
- Params: `id` là `exam_session.id`.
- Query: Không có.
- Body:
```json
{
  "question_id": "uuid",
  "choice_ids": ["choice-uuid"]
}
```
- Response thành công:
```json
{
  "question_id": "uuid",
  "choice_ids": ["choice-uuid"]
}
```
- Response lỗi:
```json
{
  "error": "Lưu đáp án thất bại: Thiếu question_id hoặc choice_ids"
}
```
- Ghi chú: Có thể gửi `choice_id` thay cho `choice_ids`. Với câu điền khuyết, service lấy text từ phần tử đầu tiên của `choice_ids`.

### Nộp bài

- Method: POST
- Endpoint: `/api/student/sessions/:id/submit`
- Quyền truy cập: Student + `X-Exam-Token`
- Mô tả: Chuyển phiên thi sang submitted và tạo submission tự động.
- Params: `id` là `exam_session.id`.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "submission": {
    "id": "uuid",
    "score": 8,
    "max_score": 10
  }
}
```
- Response lỗi:
```json
{
  "error": "Nộp bài thất bại: Phiên làm bài không ở trạng thái đang diễn ra"
}
```
- Ghi chú: Chấm điểm dựa trên `scoring_mode` của exam instance.

### Lấy dashboard sinh viên

- Method: GET
- Endpoint: `/api/student/dashboard`
- Quyền truy cập: Student
- Mô tả: Lấy dashboard cá nhân của sinh viên.
- Params: Không có.
- Query: Không có.
- Body: Không có.
- Response thành công:
```json
{
  "summary": {},
  "upcomingExams": [],
  "recentSubmissions": []
}
```
- Response lỗi:
```json
{
  "error": "Lấy dashboard thất bại: Mô tả lỗi"
}
```
- Ghi chú: Dữ liệu từ `studentService.getStudentDashboard`.

## File upload / Media

### Upload ảnh lên Cloudinary

- Method: POST
- Endpoint: `/api/upload/image`
- Quyền truy cập: Public trong router hiện tại
- Mô tả: Upload ảnh lên Cloudinary và trả URL.
- Params: Không có.
- Query: Không có.
- Body: `multipart/form-data`, field file là `image`.
- Upload file: MIME `image/jpeg`, `image/png`, `image/webp`, `image/gif`, tối đa 5MB.
- Response thành công:
```json
{
  "message": "Upload anh thanh cong",
  "url": "https://res.cloudinary.com/...",
  "publicId": "online-exam/...",
  "width": 800,
  "height": 600,
  "format": "png"
}
```
- Response lỗi:
```json
{
  "message": "Khong tim thay file anh"
}
```
- Ghi chú: `routes/index.js` đang mount `/upload` trước auth, nên endpoint này không cần đăng nhập theo code hiện tại.

### Lấy media import cục bộ

- Method: GET
- Endpoint: `/api/media/imported/*`
- Quyền truy cập: Authenticated
- Mô tả: Trả file ảnh/media được tách ra khi import đề.
- Params: wildcard path sau `/imported/`.
- Query: Không có.
- Body: Không có.
- Response thành công: File binary qua `res.sendFile`.
- Response lỗi:
```json
{
  "error": "Khong tim thay anh"
}
```
- Ghi chú: Controller chặn path traversal và chỉ đọc trong `backend/uploads/imported-media`.

## API cũ/không còn sử dụng hoặc cần kiểm tra thêm

### POST `/api/auth/register`

- Lý do: route này đang bị comment trong `backend/src/routes/authRoutes.js`; luồng hiện tại là `/api/auth/register-request` và `/api/auth/register-confirm`.

### `/api/exam-import/*`

- Lý do: `app.use("/api/exam-import", examImportRoutes)` đang bị comment trong `backend/src/server.js`; file `examImportRoutes(delete).js` cũng là file comment/delete. Chức năng import đề hiện active dưới `/api/teacher/questions/import/*`.

### PUT `/api/admin/classes/:id/restore`

- Lý do: `adminController.restoreClass` và `adminService.restoreClass` có tồn tại, nhưng `backend/src/routes/adminRoutes.js` không khai báo route này.

### PUT `/api/teacher/classes/:id/restore`

- Lý do: `teacherController.restoreClass` và `teacherService.restoreClass` có tồn tại, nhưng `backend/src/routes/teacherRoutes.js` không khai báo route này.

### GET `/api/teacher/questions?includeDeleted=true`

- Lý do: `teacherService.getQuestionsbyTeacher` có nhận option `includeDeleted`, nhưng `teacherController.getQuestionsbyTeacher` hiện không đọc query và luôn gọi service không truyền option. Cần kiểm tra thêm nếu frontend đang kỳ vọng query này.
