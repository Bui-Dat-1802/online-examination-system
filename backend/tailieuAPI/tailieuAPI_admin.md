# TÀI LIỆU API - ADMIN

Nguồn đối chiếu code: `backend/src/routes/adminRoutes.js`, `backend/src/controllers/adminController.js`, `backend/src/services/adminService.js`, middleware `auth.js`, `admin.js`.

- Local Base URL: `http://localhost:3000/api`
- Quyền truy cập: tất cả endpoint trong file này cần `Authorization: Bearer <accessToken>` và role `admin`.
- Chi tiết response mẫu đầy đủ xem: `backend/tailieuAPI/tailieuAPI.md`.

## Quản trị hệ thống

### Lấy thống kê tổng quan
- Method: GET
- Endpoint: `/api/admin/statistics`
- Quyền truy cập: Admin
- Query/Body/Params: không có.
- Response thành công: object thống kê tổng quan.
- Response lỗi: `{ "error": "Chỉ dành cho quản trị viên" }`

### Lấy dashboard admin
- Method: GET
- Endpoint: `/api/admin/dashboard`
- Quyền truy cập: Admin
- Query/Body/Params: không có.
- Response thành công: object dashboard.

### Lấy lịch sử hoạt động admin
- Method: GET
- Endpoint: `/api/admin/activities`
- Quyền truy cập: Admin
- Query: `page`, `limit`, `actionType`.
- Response thành công: danh sách activity và pagination.

## Quản lý người dùng

### Lấy danh sách người dùng
- Method: GET
- Endpoint: `/api/admin/users`
- Quyền truy cập: Admin
- Query: `role`, `status=active|locked`, `search`, `page`, `limit`.
- Response thành công: `{ "users": [], "pagination": {} }`

### Lấy chi tiết người dùng
- Method: GET
- Endpoint: `/api/admin/users/:id`
- Quyền truy cập: Admin
- Params: `id`.
- Response thành công: thông tin user, role, trạng thái, session.
- Response lỗi phổ biến: `{ "error": "User not found" }`

### Khóa tài khoản
- Method: PUT
- Endpoint: `/api/admin/users/:id/lock`
- Quyền truy cập: Admin
- Params: `id`.
- Response thành công: user với `status: "locked"`.
- Response lỗi phổ biến: không thể khóa chính tài khoản admin hiện tại.

### Mở khóa tài khoản
- Method: PUT
- Endpoint: `/api/admin/users/:id/unlock`
- Quyền truy cập: Admin
- Params: `id`.
- Response thành công: user với `status: "active"`.

### Reset mật khẩu user
- Method: POST
- Endpoint: `/api/admin/users/:id/reset-password`
- Quyền truy cập: Admin
- Params: `id`.
- Body: tùy chọn `password`; nếu không gửi dùng mặc định `"Password123"`.
- Response thành công: message reset mật khẩu.
- Response lỗi phổ biến: không reset chính mình qua admin panel.

## Quản lý lớp học

### Lấy danh sách lớp học
- Method: GET
- Endpoint: `/api/admin/classes`
- Quyền truy cập: Admin
- Query: `search`, `status`, `page`, `limit`.
- Response thành công: `{ "classes": [], "pagination": {} }`
- Ghi chú: Controller chưa truyền `includeDeleted` dù service có hỗ trợ.

### Lấy chi tiết lớp học
- Method: GET
- Endpoint: `/api/admin/classes/:id`
- Quyền truy cập: Admin
- Params: `id`.
- Response thành công: chi tiết lớp, giáo viên, sinh viên.

### Xóa lớp học
- Method: DELETE
- Endpoint: `/api/admin/classes/:id`
- Quyền truy cập: Admin
- Params: `id`.
- Response thành công: message xóa mềm lớp.
- Ghi chú: Hành động được ghi vào `admin_action`.

## Quản lý ca thi

### Lấy danh sách ca thi
- Method: GET
- Endpoint: `/api/admin/exams`
- Quyền truy cập: Admin
- Query: `status`, `search`, `page`, `limit`.
- Response thành công: `{ "exams": [], "pagination": {} }`
- Ghi chú: `status=suspended` được service normalize thành `unpublished`.

### Lấy chi tiết ca thi
- Method: GET
- Endpoint: `/api/admin/exams/:id`
- Quyền truy cập: Admin
- Params: `id` là `exam_instance.id`.
- Response thành công: chi tiết ca thi, template, lớp, sessions, submissions.

## Export / Báo cáo

### Xuất danh sách sinh viên CSV
- Method: GET
- Endpoint: `/api/admin/export/students`
- Quyền truy cập: Admin
- Query: `classId`, `status=active|locked`.
- Response thành công: file `text/csv; charset=utf-8`.

### Xuất kết quả thi CSV
- Method: GET
- Endpoint: `/api/admin/export/results/:examId`
- Quyền truy cập: Admin
- Params: `examId` là `exam_instance.id`.
- Response thành công: file CSV.

### Xuất nhật ký thi CSV
- Method: GET
- Endpoint: `/api/admin/export/logs/:examId`
- Quyền truy cập: Admin
- Params: `examId` là `exam_instance.id`.
- Response thành công: file CSV.

## API cũ/không còn sử dụng

- `PUT /api/admin/classes/:id/restore`: có controller/service nhưng không có route trong `adminRoutes.js`.
