# TÀI LIỆU API - STUDENT / SINH VIÊN

Nguồn đối chiếu code: `backend/src/routes/studentRoutes.js`, `studentController.js`, `studentService.js`, middleware `auth.js`, `student.js`, `examSession.js`.

- Local Base URL: `http://localhost:3000/api`
- Quyền truy cập: cần `Authorization: Bearer <accessToken>` với role `student`; middleware student hiện cũng cho phép role `admin`.
- Các API `/sessions/:id/*` cần thêm `X-Exam-Token` lấy từ API bắt đầu thi.
- Chi tiết response mẫu đầy đủ xem: `backend/tailieuAPI/tailieuAPI.md`.

## Lớp học

### Gửi yêu cầu tham gia lớp
- Method: POST
- Endpoint: `/api/student/enroll`
- Quyền truy cập: Student
- Body: `classCode`, tùy chọn `note`.
- Response thành công: enrollment request và message.

### Lấy danh sách lớp đã tham gia
- Method: GET
- Endpoint: `/api/student/classes`
- Quyền truy cập: Student
- Query: `status=pending|approved` bắt buộc theo service hiện tại.
- Response thành công: mảng lớp học.
- Response lỗi phổ biến: `{ "error": "Trạng thái không hợp lệ" }`

### Rời lớp học
- Method: DELETE
- Endpoint: `/api/student/classes/:id`
- Quyền truy cập: Student
- Params: `id` là class ID.
- Response thành công: HTTP 204.

### Hủy yêu cầu tham gia lớp
- Method: POST
- Endpoint: `/api/student/classes/:id/cancel-enrollment`
- Quyền truy cập: Student
- Params: `id` là class ID.
- Response thành công: HTTP 204.

## Ca thi / Bài thi

### Lấy ca thi theo lớp
- Method: GET
- Endpoint: `/api/student/exams/classes/:id`
- Quyền truy cập: Student
- Params: `id` là class ID.
- Response thành công: danh sách ca thi đã công bố trong lớp.
- Ghi chú: Chỉ sinh viên đã được duyệt vào lớp mới xem được.

### Lấy tổng quan bài thi
- Method: GET
- Endpoint: `/api/student/exams/overview`
- Quyền truy cập: Student
- Response thành công: `exams` và `summary`.

### Bắt đầu ca thi
- Method: POST
- Endpoint: `/api/student/exams/:id/start`
- Quyền truy cập: Student
- Params: `id` là `exam_instance.id`.
- Response thành công: `session_id`, `token`, thời gian, trạng thái và danh sách câu hỏi.
- Ghi chú: `token` trong response phải gửi lại bằng header `X-Exam-Token`.

## Phiên thi / Bài làm

### Lấy câu hỏi trong phiên
- Method: GET
- Endpoint: `/api/student/sessions/:id/questions`
- Quyền truy cập: Student + `X-Exam-Token`
- Params: `id` là `exam_session.id`.
- Response thành công: danh sách câu hỏi đã trộn, kèm đáp án đã chọn nếu có.

### Heartbeat phiên thi
- Method: POST
- Endpoint: `/api/student/sessions/:id/heartbeat`
- Quyền truy cập: Student + `X-Exam-Token`
- Params: `id` là `exam_session.id`.
- Body: `focusLost` boolean.
- Response thành công: `state`, `focus_lost_count`, `locked`.
- Ghi chú: Có thể khóa phiên nếu vượt `EXAM_FOCUS_LOST_THRESHOLD`.

### Lưu đáp án
- Method: POST
- Endpoint: `/api/student/sessions/:id/answers`
- Quyền truy cập: Student + `X-Exam-Token`
- Params: `id` là `exam_session.id`.
- Body: `question_id` và `choice_ids` hoặc `choice_id`.
- Response thành công: đáp án đã lưu.
- Ghi chú: Với câu điền khuyết, text answer được lấy từ phần tử đầu của `choice_ids`.

### Nộp bài
- Method: POST
- Endpoint: `/api/student/sessions/:id/submit`
- Quyền truy cập: Student + `X-Exam-Token`
- Params: `id` là `exam_session.id`.
- Response thành công: submission, điểm và chi tiết chấm.

## Dashboard

### Lấy dashboard sinh viên
- Method: GET
- Endpoint: `/api/student/dashboard`
- Quyền truy cập: Student
- Response thành công: thống kê cá nhân, ca thi sắp tới, bài làm gần đây.

## Ghi chú giám sát

- Middleware `examSession.js` kiểm tra session token, owner, trạng thái `started`, thời hạn phiên, IP/User-Agent.
- Nếu đổi IP/User-Agent, hệ thống tạo `session_flag`; tùy env `EXAM_LOCK_ON_IP_CHANGE` hoặc `EXAM_LOCK_ON_UA_CHANGE` có thể khóa phiên.
