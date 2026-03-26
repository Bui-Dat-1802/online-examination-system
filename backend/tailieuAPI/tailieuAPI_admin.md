# TÀI LIỆU API - ADMIN

# API: Quản lý người dùng, Quản lý lớp học & Giám sát kỳ thi

Tài liệu này mô tả các endpoint dành cho **Admin** để quản lý người dùng, lớp học và giám sát kỳ thi trong hệ thống.

**Lưu ý:** Admin KHÔNG soạn đề thi, chỉ giám sát và kiểm soát kỳ thi.

---

## Tổng quan

- **Base URL (prod):** `https://api.example.com/`
- **Authentication:** Access token (Bearer JWT) với role `admin`
- **Response format:** JSON
- **Time format:** ISO 8601 UTC (`2025-11-13T14:22:00Z`)

---

## Quy ước chung

- Header bắt buộc cho các request: `Authorization: Bearer <access_token>`
- Content-Type cho request body: `application/json`
- Mã lỗi chung: HTTP status + body dạng `{"error": "MÔ TẢ LỖI"}`
- Mã thành công chung: HTTP status + body dạng `{"message": "MÔ TẢ THÀNH CÔNG"}`
- **Lưu ý:** Tất cả endpoint yêu cầu role `admin`, nếu không sẽ trả về `403 Forbidden`

---

## Endpoint 1 - Lấy thống kê tổng quan

**GET `/api/admin/statistics`**

- **Mô tả: Lấy thống kê tổng quan hệ thống**
- **HTTP:** GET 
- **URL:** `/api/admin/statistics`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**

```json
{
  "total_users": 150,
  "active_users": 145,
  "locked_users": 5,
  "by_role": {
    "student": 120,
    "teacher": 25,
    "admin": 5
  },
  "new_users_last_7_days": 12
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
  "error": "Không có quyền truy cập"
}
```

- **403 Forbidden** (không phải admin)

```json
{
  "error": "Chỉ dành cho quản trị viên"
}
```

---

## Endpoint 2 - Lấy danh sách người dùng
**GET `/api/admin/users?role=student&status=active&search=john&page=1&limit=50`**

- **Mô tả: Lấy danh sách người dùng với bộ lọc**
- **HTTP:** GET 
- **URL:** `/api/admin/users`
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `role` (optional): `student`, `teacher`, `admin`
  - `status` (optional): `active`, `locked`
  - `search` (optional): Tìm kiếm theo tên hoặc email
  - `page` (optional): Số trang (default: 1)
  - `limit` (optional): Số lượng mỗi trang (default: 50)

- **Response body:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "student@example.com",
      "name": "John Doe",
      "role": "student",
      "role_id": "uuid",
      "status": "active",
      "created_at": "2025-01-01T00:00:00Z",
      "last_login_at": "2025-12-25T10:30:00Z",
      "active_sessions": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "totalPages": 3
  }
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
  "error": "Không có quyền truy cập"
}
```

---

## Endpoint 3 - Chi tiết người dùng
**GET `/api/admin/users/:id`**

- **Mô tả: Lấy thông tin chi tiết một người dùng**
- **HTTP:** GET 
- **URL:** `/api/admin/users/:id`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
```json
{
  "id": "uuid",
  "email": "student@example.com",
  "name": "John Doe",
  "bio": "Student bio",
  "role": "student",
  "role_id": "uuid",
  "status": "active",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-12-20T00:00:00Z",
  "last_login_at": "2025-12-25T10:30:00Z",
  "classes_count": 5,
  "enrollments_count": 3,
  "sessions": [
    {
      "id": "uuid",
      "ip": "192.168.1.1",
      "created_at": "2025-12-25T10:00:00Z",
      "expires_at": "2025-12-26T10:00:00Z",
      "is_active": true
    }
  ]
}
```

- **404 Not Found** (user không tồn tại)

```json
{
  "error": "User not found"
}
```

---

## Endpoint 4 - Khóa tài khoản
**PUT `/api/admin/users/:id/lock`**

- **Mô tả: Khóa tài khoản người dùng (set is_active = false)**
- **HTTP:** PUT
- **URL:** `/api/admin/users/:id/lock`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "status": "locked",
  "message": "User locked successfully"
}
```

- **403 Forbidden** (không thể khóa tài khoản của chính mình)

```json
{
  "error": "Cannot lock your own account"
}
```

---

## Endpoint 5 - Mở khóa tài khoản
**PUT `/api/admin/users/:id/unlock`**

- **Mô tả: Mở khóa tài khoản người dùng (set is_active = true)**
- **HTTP:** PUT
- **URL:** `/api/admin/users/:id/unlock`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "status": "active",
  "message": "User unlocked successfully"
}
```

---

## Endpoint 6 - Reset mật khẩu
**POST `/api/admin/users/:id/reset-password`**

- **Mô tả: Reset mật khẩu người dùng về mật khẩu mặc định**
- **HTTP:** POST
- **URL:** `/api/admin/users/:id/reset-password`
- **Headers:** `Authorization: Bearer <access_token>`
- **Body (optional):**
```json
{
  "password": "NewPassword123"
}
```

Nếu không truyền `password`, mật khẩu mặc định sẽ là `Password123`

- **Response body:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "message": "Password reset successfully",
  "temporary_password": "NewPassword123"
}
```

- **403 Forbidden** (không thể reset mật khẩu của chính mình)

```json
{
  "error": "Cannot reset your own password through admin panel. Use profile settings."
}
```

---

## Endpoint 7 - Lấy danh sách lớp học

**GET `/api/admin/classes?search=tin+hoc&page=1&limit=50`**

- **Mô tả: Lấy danh sách tất cả lớp học trong hệ thống**
- **HTTP:** GET 
- **URL:** `/api/admin/classes`
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `search` (optional): Tìm kiếm theo tên lớp hoặc code
  - `page` (optional): Số trang (default: 1)
  - `limit` (optional): Số lượng mỗi trang (default: 50)
  - Không có **Query** thì sẽ lấy toàn bộ

- **Response body:**

```json
{
  "classes": [
    {
      "id": "uuid",
      "name": "Tin học đại cương",
      "code": "wyld1h50",
      "description": "Học lập trình vào sáng t6",
      "teacher": {
        "id": "uuid",
        "name": "Nguyễn Văn A",
        "email": "teacher@example.com"
      },
      "student_count": 25,
      "exam_count": 3,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-12-20T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "totalPages": 1
  }
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
  "error": "Không có quyền truy cập"
}
```

---

## Endpoint 8 - Chi tiết lớp học

**GET `/api/admin/classes/:id`**

- **Mô tả: Lấy thông tin chi tiết một lớp học**
- **HTTP:** GET 
- **URL:** `/api/admin/classes/:id`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**

```json
{
  "id": "uuid",
  "name": "Tin học đại cương",
  "code": "wyld1h50",
  "description": "Học lập trình vào sáng t6",
  "teacher": {
    "id": "uuid",
    "name": "Nguyễn Văn A",
    "email": "teacher@example.com"
  },
  "students": [
    {
      "id": "uuid",
      "name": "Trần Thị B",
      "email": "student@example.com",
      "enrolled_at": "2025-01-05T00:00:00Z"
    }
  ],
  "exams": [
    {
      "id": "uuid",
      "title": "Kỳ thi giữa kỳ",
      "duration_seconds": 3600,
      "created_at": "2025-01-10T00:00:00Z"
    }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-12-20T00:00:00Z"
}
```

- **404 Not Found** (lớp học không tồn tại)

```json
{
  "error": "Class not found"
}
```

---

## Endpoint 9 - Xóa lớp học (Soft Delete)

**DELETE `/api/admin/classes/:id`**

- **Mô tả: Xóa mềm (soft delete) một lớp học - lớp học sẽ được đánh dấu là đã xóa thay vì xóa vĩnh viễn. Lớp học có thể được khôi phục sau này.**
- **HTTP:** DELETE
- **URL:** `/api/admin/classes/:id`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Parameters:**
  - `id`: ID của lớp học cần xóa

- **Response body (Thành công):**

```json
{
  "class_id": "uuid",
  "class_name": "Tin học đại cương",
  "message": "Class archived successfully (soft deleted)"
}
```

**Lưu ý:**
- Lớp học sẽ được đánh dấu `is_deleted = true` và lưu thông tin người xóa, thời gian xóa
- Lớp học đã xóa sẽ không hiển thị trong danh sách lớp học thông thường
- Không thể xóa lớp học nếu có exam sessions ở trạng thái `started` hoặc `submitted`
- Hành động xóa sẽ được ghi nhận vào lịch sử admin với action_type `DELETE_CLASS`
- Có thể khôi phục lớp học bằng endpoint restore

- **400 Bad Request** (lớp học có bài thi đang hoạt động)

```json
{
  "error": "Không thể xóa lớp học có phiên thi đang hoạt động. Lớp học có dữ liệu thi."
}
```

- **404 Not Found** (lớp học không tồn tại hoặc đã bị xóa)

```json
{
  "error": "Không tìm thấy lớp học"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
  "error": "Không có quyền truy cập"
}
```

- **403 Forbidden** (không phải admin)

```json
{
  "error": "Chỉ dành cho quản trị viên"
}
```



---

## Endpoint 10 - Lấy danh sách kỳ thi

**GET `/api/admin/exams?status=ongoing&search=giua+ky&page=1&limit=50`**

- **Mô tả: Lấy danh sách tất cả kỳ thi trong hệ thống**
- **HTTP:** GET 
- **URL:** `/api/admin/exams`
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `status` (optional): `upcoming` (chưa mở), `ongoing` (đang thi), `ended` (đã kết thúc), `suspended` (tạm dừng)
  - `search` (optional): Tìm kiếm theo tên đề thi
  - `page` (optional): Số trang (default: 1)
  - `limit` (optional): Số lượng mỗi trang (default: 50)
  - Không có **Query** thì sẽ lấy toàn bộ
- **Response body:**

```json
{
  "exams": [
    {
      "id": "uuid",
      "title": "Kỳ thi giữa kỳ môn Toán",
      "class": {
        "id": "uuid",
        "name": "Toán lớp 10A1",
        "code": "toan10a1"
      },
      "teacher": {
        "id": "uuid",
        "name": "Nguyễn Văn A",
        "email": "teacher@example.com"
      },
      "starts_at": "2025-12-20T01:00:00.000Z",
      "ends_at": "2025-12-20T02:30:00.000Z",
      "duration_seconds": 3600,
      "published": true,
      "status": "ongoing",
      "total_sessions": 25,
      "submitted_sessions": 15,
      "created_at": "2025-12-10T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 30,
    "totalPages": 1
  }
}
```

**Giải thích trạng thái:**
- `upcoming`: Kỳ thi chưa bắt đầu (thời gian hiện tại < starts_at)
- `ongoing`: Kỳ thi đang diễn ra (starts_at ≤ now ≤ ends_at)
- `ended`: Kỳ thi đã kết thúc (now > ends_at)
- `unpublished`: Kỳ thi chưa công bố

- **401 Unauthorized** (missing/invalid token)

```json
{
  "error": "Không có quyền truy cập"
}
```

---

## Endpoint 10 - Chi tiết kỳ thi

**GET `/api/admin/exams/:id`**

- **Mô tả: Lấy thông tin chi tiết một kỳ thi**
- **HTTP:** GET 
- **URL:** `/api/admin/exams/:id`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**

```json
{
  "id": "uuid",
  "title": "Kỳ thi giữa kỳ môn Toán",
  "description": "Kiểm tra kiến thức chương 1-3",
  "class": {
    "id": "uuid",
    "name": "Toán lớp 10A1",
    "code": "toan10a1"
  },
  "teacher": {
    "id": "uuid",
    "name": "Nguyễn Văn A",
    "email": "teacher@example.com"
  },
  "starts_at": "2025-12-20T01:00:00.000Z",
  "ends_at": "2025-12-20T02:30:00.000Z",
  "duration_seconds": 3600,
  "passing_score": "5.00",
  "published": true,
  "show_answers": false,
  "status": "ongoing",
  "question_count": 20,
  "sessions": [
    {
      "id": "uuid",
      "state": "submitted",
      "started_at": "2025-12-20T01:05:00.000Z",
      "student": {
        "id": "uuid",
        "name": "Trần Thị B",
        "email": "student@example.com"
      },
      "score": "8.50",
      "max_score": "10.00"
    }
  ],
  "created_at": "2025-12-10T00:00:00.000Z"
}
```

- **404 Not Found** (kỳ thi không tồn tại)

```json
{
  "error": "Exam not found"
}
```

---



## Endpoint 11 - Xóa lớp học

**DELETE `/api/admin/classes/:id`**

- **Mô tả: Xóa lớp học**
  - Chỉ xóa được khi chưa có dữ liệu thi (exam sessions)
  - Nếu có bài thi đã được làm, không cho phép xóa
- **HTTP:** DELETE
- **URL:** `/api/admin/classes/:id`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**

```json
{
  "class_id": "uuid",
  "class_name": "Tin học đại cương",
  "message": "Class deleted successfully"
}
```

- **400 Bad Request** (lớp có dữ liệu thi)

```json
{
  "error": "Cannot delete class with active exam sessions. Class has exam data."
}
```

- **404 Not Found** (lớp học không tồn tại)

```json
{
  "error": "Class not found"
}
```

---

## Endpoint 9 - Lấy thống kê Dashboard

**GET `/api/admin/dashboard`**

- **Mô tả: Lấy thống kê tổng quan cho dashboard quản trị**
- **HTTP:** GET 
- **URL:** `/api/admin/dashboard`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**

```json
{
  "users": {
    "total": 150
  },
  "classes": {
    "total": 25
  },
  "exams": {
    "total": 50,
    "active": 3,
    "upcoming": 5
  },
  "submissions": {
    "today": 12
  }
}
```

**Giải thích:**
- `users.total`: Tổng số người dùng trong hệ thống
- `classes.total`: Tổng số lớp học
- `exams.total`: Tổng số kỳ thi
- `exams.active`: Số kỳ thi đang diễn ra
- `exams.upcoming`: Số kỳ thi sắp diễn ra (trong 7 ngày tới)
- `submissions.today`: Số bài thi đã nộp hôm nay

- **401 Unauthorized** (missing/invalid token)

```json
{
  "error": "Không có quyền truy cập"
}
```

---

## Endpoint 10 - Xuất danh sách học sinh (CSV)

**GET `/api/admin/export/students?classId=xxx&status=active`**

- **Mô tả: Xuất danh sách học sinh ra file CSV**
- **HTTP:** GET 
- **URL:** `/api/admin/export/students`
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `classId` (optional): Lọc theo lớp học cụ thể
  - `status` (optional): `active`, `locked` - Lọc theo trạng thái tài khoản

- **Response:** File CSV với định dạng UTF-8 (BOM)
- **Content-Type:** `text/csv; charset=utf-8`
- **Filename:** `danh-sach-hoc-sinh-{timestamp}.csv`

**Cấu trúc CSV:**
```
ID,Email,Họ tên,Trạng thái,Lớp học,Ngày tạo,Đăng nhập gần nhất
"uuid","student@example.com","Nguyễn Văn A","Hoạt động","Tin học (IT4409)","2025-01-01T00:00:00Z","2025-12-27T10:30:00Z"
```

- **401 Unauthorized** (missing/invalid token)

```json
{
  "error": "Không có quyền truy cập"
}
```

---

## Endpoint 11 - Xuất kết quả thi (CSV)

**GET `/api/admin/export/results/:examId`**

- **Mô tả: Xuất kết quả thi của một kỳ thi ra file CSV**
- **HTTP:** GET 
- **URL:** `/api/admin/export/results/:examId`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Parameters:**
  - `examId`: ID của kỳ thi cần xuất kết quả

- **Response:** File CSV với định dạng UTF-8 (BOM)
- **Content-Type:** `text/csv; charset=utf-8`
- **Filename:** `ket-qua-thi-{examId}-{timestamp}.csv`

**Cấu trúc CSV:**
```
ID,Email,Họ tên,Trạng thái,Điểm,Điểm tối đa,Phần trăm,Kết quả,Thời gian bắt đầu,Thời gian nộp bài,Thời gian chấm
"uuid","student@example.com","Nguyễn Văn A","submitted","8.50","10.00","85.00%","Đạt","2025-12-27T09:00:00Z","2025-12-27T10:30:00Z","2025-12-27T10:31:00Z"
```

**Giải thích:**
- `Trạng thái`: pending, started, submitted, expired, locked
- `Phần trăm`: Tỷ lệ phần trăm điểm đạt được
- `Kết quả`: "Đạt" hoặc "Không đạt" dựa trên điểm chuẩn

- **404 Not Found** (kỳ thi không tồn tại)

```json
{
  "error": "Không tìm thấy kỳ thi"
}
```

---

## Endpoint 12 - Xuất nhật ký thi (CSV)

**GET `/api/admin/export/logs/:examId`**

- **Mô tả: Xuất nhật ký hoạt động của một kỳ thi ra file CSV**
- **HTTP:** GET 
- **URL:** `/api/admin/export/logs/:examId`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Parameters:**
  - `examId`: ID của kỳ thi cần xuất nhật ký

- **Response:** File CSV với định dạng UTF-8 (BOM)
- **Content-Type:** `text/csv; charset=utf-8`
- **Filename:** `nhat-ky-thi-{examId}-{timestamp}.csv`

**Cấu trúc CSV:**
```
Thời gian,Loại sự kiện,Người dùng,Email,Session ID,IP,User Agent,Chi tiết
"2025-12-27T05:51:15.111Z","EXAM_START","student11","student1@gmail.com","086ada2f-6640-433a-91e5-408172e8ffc8","::ffff:172.31.80.1","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36","""Học sinh bắt đầu làm bài thi 154a437d-8d11-4c23-b1bf-8b42e55f344d"""
"2025-12-27T05:51:26.713Z","TAB_SWITCH","student11","student1@gmail.com","086ada2f-6640-433a-91e5-408172e8ffc8","::ffff:172.31.80.1","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36","""Người dùng đã chuyển tab hoặc mất focus cửa sổ lần thứ 1"""
"2025-12-27T05:51:45.142Z","TAB_SWITCH","student11","student1@gmail.com","086ada2f-6640-433a-91e5-408172e8ffc8","::ffff:172.31.80.1","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36","""Người dùng đã chuyển tab hoặc mất focus cửa sổ lần thứ 0"""
"2025-12-27T05:51:45.527Z","TAB_SWITCH","student11","student1@gmail.com","086ada2f-6640-433a-91e5-408172e8ffc8","::ffff:172.31.80.1","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36","""Người dùng đã chuyển tab hoặc mất focus cửa sổ lần thứ 2"""
"2025-12-27T05:52:00.762Z","ANSWER_SUBMIT","student11","student1@gmail.com","086ada2f-6640-433a-91e5-408172e8ffc8","N/A","","""Học sinh trả lời câu hỏi 5dceff08-479a-45f4-b4e7-b9a22450d1d8 với lựa chọn [\""d25da15f-06fc-48b5-a39b-6eef61d3e965\""]"""
```

**Loại sự kiện thường gặp:**
- `EXAM_START`: Bắt đầu làm bài
- `EXAM_SUBMIT`: Nộp bài
- `TAB_SWITCH`: Chuyển tab
- `ANSWER_SAVE`: Lưu câu trả lời
-  `BROWSER_CHANGE`: Thay đổi trình duyệt
- `IP_CHANGE`: IP làm bài thay đổi
- **404 Not Found** (kỳ thi không tồn tại)

```json
{
  "error": "Không tìm thấy kỳ thi"
}
```

---

## Endpoint 13 - Lấy thống kê Dashboard

**GET `/api/admin/dashboard`**

- **Mô tả: Lấy thống kê tổng quan cho dashboard admin, bao gồm lịch sử hoạt động của admin đó**
- **HTTP:** GET 
- **URL:** `/api/admin/dashboard`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**

```json
{
  "users": {
    "total": 150
  },
  "classes": {
    "total": 25
  },
  "exams": {
    "total": 80,
    "active": 3,
    "upcoming": 5
  },
  "submissions": {
    "today": 45
  },
  "admin_activities": [
    {
      "id": "uuid",
      "action_type": "LOCK_USER",
      "target_type": "user",
      "target_id": "uuid",
      "description": "Khóa tài khoản student@example.com",
      "metadata": {
        "user_email": "student@example.com",
        "user_name": "Nguyễn Văn A"
      },
      "ip_address": "192.168.1.1",
      "created_at": "2025-12-29T10:30:00Z"
    },
    {
      "id": "uuid",
      "action_type": "RESET_PASSWORD",
      "target_type": "user",
      "target_id": "uuid",
      "description": "Reset mật khẩu cho tài khoản teacher@example.com",
      "metadata": {
        "user_email": "teacher@example.com",
        "user_name": "Trần Thị B"
      },
      "ip_address": "192.168.1.1",
      "created_at": "2025-12-29T09:15:00Z"
    }
  ]
}
```

**Giải thích:**
```
LOCK_USER - Khóa tài khoản người dùng
UNLOCK_USER - Mở khóa tài khoản người dùng
RESET_PASSWORD - Reset mật khẩu người dùng
DELETE_CLASS - Xóa lớp học
```
- **401 Unauthorized** (missing/invalid token)

```json
{
  "error": "Không có quyền truy cập"
}
```

- **403 Forbidden** (không phải admin)

```json
{
  "error": "Chỉ dành cho quản trị viên"
}
```

---

