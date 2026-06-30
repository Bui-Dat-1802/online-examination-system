# TÀI LIỆU API - TEACHER / GIÁO VIÊN

Nguồn đối chiếu code: `backend/src/routes/teacherRoutes.js`, `teacherController.js`, `examImportController.js`, `teacherService.js`, `examImportService.js`, middleware upload.

- Local Base URL: `http://localhost:3000/api`
- Quyền truy cập: cần `Authorization: Bearer <accessToken>` với role `teacher`; middleware teacher hiện cũng cho phép role `admin`, nhưng một số controller tự kiểm tra role phải đúng `teacher`.
- Chi tiết response mẫu đầy đủ xem: `backend/tailieuAPI/tailieuAPI.md`.

## Lớp học

### Tạo lớp học
- Method: POST
- Endpoint: `/api/teacher/classes`
- Quyền truy cập: Teacher
- Body: `name`, `description`.
- Response thành công: `newClass`, `message`.
- Ghi chú: Mã lớp sinh tự động 8 ký tự.

### Lấy danh sách lớp
- Method: GET
- Endpoint: `/api/teacher/classes`
- Quyền truy cập: Teacher
- Query: `includeDeleted=true|false`.
- Response thành công: mảng lớp của giáo viên.

### Lấy chi tiết lớp
- Method: GET
- Endpoint: `/api/teacher/classes/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Query: `includeDeleted=true|false`.
- Response thành công: `classInfo`, `listStudent`.

### Cập nhật lớp
- Method: PUT
- Endpoint: `/api/teacher/classes/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Body: `name`, `description` hoặc trường lớp cần cập nhật.
- Response thành công: `updatedClass`, `message`.

### Xóa lớp
- Method: DELETE
- Endpoint: `/api/teacher/classes/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: message xóa lớp.

### Thêm sinh viên vào lớp
- Method: POST
- Endpoint: `/api/teacher/classes/:classId/students`
- Quyền truy cập: Teacher
- Params: `classId`.
- Body: `email`.
- Response thành công: `enrollment`, `message`.
- Ghi chú: Controller yêu cầu `req.user.role_name === "teacher"`.

### Preview import sinh viên
- Method: POST
- Endpoint: `/api/teacher/classes/:classId/students/import/preview`
- Quyền truy cập: Teacher
- Params: `classId`.
- Body: `multipart/form-data`, field file `file`.
- Upload file: `.csv`, `.txt`, `.xlsx`, `.xls`, `.docx`, tối đa 10MB.
- Response thành công: kết quả kiểm tra email.

### Confirm import sinh viên
- Method: POST
- Endpoint: `/api/teacher/classes/:classId/students/import/confirm`
- Quyền truy cập: Teacher
- Params: `classId`.
- Body: `emails` array.
- Response thành công: số lượng thêm thành công và danh sách bỏ qua.

### Xóa sinh viên khỏi lớp
- Method: DELETE
- Endpoint: `/api/teacher/classes/:classId/students/:studentId`
- Quyền truy cập: Teacher
- Params: `classId`, `studentId`.
- Response thành công: message xóa sinh viên khỏi lớp.

### Lấy yêu cầu tham gia lớp
- Method: GET
- Endpoint: `/api/teacher/classes/:id/enrollment-requests`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: danh sách yêu cầu pending.

### Duyệt/từ chối yêu cầu tham gia lớp
- Method: POST
- Endpoint: `/api/teacher/enrollment-requests/approve`
- Quyền truy cập: Teacher
- Body: `requestId`, `status=approved|rejected`.
- Response thành công: message cập nhật trạng thái.

### Tìm sinh viên trong lớp
- Method: GET
- Endpoint: `/api/teacher/classes/:classId/students`
- Quyền truy cập: Teacher
- Params: `classId`.
- Query: `keyword`.
- Response thành công: danh sách sinh viên đã duyệt.
- Ghi chú: Tài liệu cũ ghi nhầm method là PUT và endpoint có hai dấu `/`.

## Question / Câu hỏi

### Tạo câu hỏi
- Method: POST
- Endpoint: `/api/teacher/questions`
- Quyền truy cập: Teacher
- Body: `text`, `type`, tùy chọn `explanation`, `tags`, `difficulty`, `choices`, `correct_text_answer`.
- Response thành công: `newQuestion`, `message`.
- Ghi chú: `type` nhận `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `FILL_IN_THE_BLANK`.

### Lấy danh sách câu hỏi
- Method: GET
- Endpoint: `/api/teacher/questions`
- Quyền truy cập: Teacher
- Query: không có trong controller hiện tại.
- Response thành công: mảng câu hỏi.
- Ghi chú: Service có option `includeDeleted`, controller chưa truyền query này.

### Cập nhật câu hỏi
- Method: PUT
- Endpoint: `/api/teacher/questions/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Body: các trường câu hỏi cần cập nhật.
- Response thành công: `updatedQuestion`, `message`.

### Xóa câu hỏi
- Method: DELETE
- Endpoint: `/api/teacher/questions/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: `{ "message": "Xóa câu hỏi thành công" }`

### Khôi phục câu hỏi
- Method: PUT
- Endpoint: `/api/teacher/questions/:id/restore`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: `{ "message": "Khôi phục câu hỏi thành công" }`

### Lấy chi tiết câu hỏi
- Method: GET
- Endpoint: `/api/teacher/questions/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: chi tiết câu hỏi.

## Exam template / Mẫu đề thi

### Tạo mẫu đề thi
- Method: POST
- Endpoint: `/api/teacher/exam-templates`
- Quyền truy cập: Teacher
- Body: `title`, `class_id`, `duration_seconds`, tùy chọn `description`, `shuffle_questions`, `shuffle_choices`, `passing_score`.
- Response thành công: `newTemplate`, `message`.

### Lấy mẫu đề thi của giáo viên
- Method: GET
- Endpoint: `/api/teacher/exam-templates`
- Quyền truy cập: Teacher
- Query: `includeDeleted=true|false`.
- Response thành công: mảng mẫu đề.

### Cập nhật mẫu đề thi
- Method: PUT
- Endpoint: `/api/teacher/exam-templates/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Body: trường mẫu đề cần cập nhật.
- Response thành công: `updatedTemplate`, `message`.

### Xóa mẫu đề thi
- Method: DELETE
- Endpoint: `/api/teacher/exam-templates/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: message xóa mẫu đề.

### Khôi phục mẫu đề thi
- Method: PUT
- Endpoint: `/api/teacher/exam-templates/:id/restore`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: result từ service.

### Tìm kiếm mẫu đề thi
- Method: GET
- Endpoint: `/api/teacher/exam-templates/search`
- Quyền truy cập: Teacher
- Query: `keyword`.
- Response thành công: mảng mẫu đề.

### Lấy chi tiết mẫu đề thi
- Method: GET
- Endpoint: `/api/teacher/exam-templates/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: chi tiết mẫu đề.

### Lấy mẫu đề thi theo lớp
- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-templates`
- Quyền truy cập: Teacher
- Params: `classId`.
- Query: `includeDeleted=true|false`.
- Response thành công: mảng mẫu đề thuộc lớp.

## Exam instance / Ca thi

### Tạo ca thi
- Method: POST
- Endpoint: `/api/teacher/exam-instances`
- Quyền truy cập: Teacher
- Body: `templateId`, `starts_at`, `ends_at`, `questions`; tùy chọn `title`, `published`, `show_answers`, `scoring_mode`.
- Response thành công: `newInstance`, `message`.
- Ghi chú: `questions` gồm `question_id` hoặc `id`, tùy chọn `points`.

### Xóa ca thi
- Method: DELETE
- Endpoint: `/api/teacher/exam-instances/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: message xóa ca thi.

### Khôi phục ca thi
- Method: PUT
- Endpoint: `/api/teacher/exam-instances/:id/restore`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: message khôi phục.

### Lấy ca thi theo mẫu đề
- Method: GET
- Endpoint: `/api/teacher/exam-templates/:templateId/exam-instances`
- Quyền truy cập: Teacher
- Params: `templateId`.
- Response thành công: mảng ca thi.

### Cập nhật ca thi
- Method: PUT
- Endpoint: `/api/teacher/exam-instances/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Body: trường ca thi cần cập nhật; có thể gồm `questions`.
- Response thành công: `updatedInstance`, `message`.

### Lấy chi tiết ca thi
- Method: GET
- Endpoint: `/api/teacher/exam-instances/:id`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: chi tiết ca thi.

### Công bố ca thi
- Method: POST
- Endpoint: `/api/teacher/exam-instances/:id/publish`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: `{ "message": "Công bố đề thi thành công" }`

### Hủy công bố ca thi
- Method: POST
- Endpoint: `/api/teacher/exam-instances/:id/unpublish`
- Quyền truy cập: Teacher
- Params: `id`.
- Response thành công: `{ "message": "Hủy công bố đề thi thành công" }`

### Lấy ca thi của lớp
- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-instances`
- Quyền truy cập: Teacher
- Params: `classId`.
- Response thành công: mảng ca thi thuộc lớp.

### Cộng/đặt thêm thời gian cho sinh viên
- Method: POST
- Endpoint: `/api/teacher/exam-instances/:id/accommodations`
- Quyền truy cập: Teacher
- Params: `id` là `exam_instance.id`.
- Body: `student_id` và một trong `extra_seconds`, `add_seconds`, tùy chọn `notes`.
- Response thành công: `accommodation`, `message`.

### Xuất nhiều mã đề đã trộn
- Method: POST
- Endpoint: `/api/teacher/exams/:id/export-variants`
- Quyền truy cập: Teacher
- Params: `id` là `exam_instance.id`.
- Body: `format=docx|doc|pdf`, `variantCount`, `includeAnswerCsv`.
- Response thành công: file binary hoặc zip.

## Monitoring / Exam session

### Lấy sinh viên đang thi
- Method: GET
- Endpoint: `/api/teacher/classes/:classId/active-students`
- Quyền truy cập: Teacher
- Params: `classId`.
- Response thành công: danh sách sinh viên có session `started`.

### Lấy flag vi phạm
- Method: GET
- Endpoint: `/api/teacher/classes/:examInstanceId/flags`
- Quyền truy cập: Teacher
- Params: `examInstanceId`.
- Response thành công: danh sách flag.
- Ghi chú: Tên route đang dùng `classes` nhưng param là `examInstanceId`.

### Khóa phiên thi
- Method: POST
- Endpoint: `/api/teacher/exam-sessions/:id/lock`
- Quyền truy cập: Teacher
- Params: `id` là `exam_session.id`.
- Body: tùy chọn `reason`.
- Response thành công: session/result và message.

### Mở khóa phiên thi
- Method: POST
- Endpoint: `/api/teacher/exam-sessions/:id/unlock`
- Quyền truy cập: Teacher
- Params: `id` là `exam_session.id`.
- Body: tùy chọn `reason`.
- Response thành công: session/result và message.

### Lấy dữ liệu giám sát
- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-instances/:examInstanceId/monitor`
- Quyền truy cập: Teacher
- Params: `classId`, `examInstanceId`.
- Response thành công: `summary`, `students`, `flags`.

### Lấy tiến độ làm bài
- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-instances/:examInstanceId/progress`
- Quyền truy cập: Teacher
- Params: `classId`, `examInstanceId`.
- Response thành công: nhóm sinh viên theo trạng thái tiến độ.

### Lấy điểm sinh viên trong lớp theo ca thi
- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-instances/:examInstanceId/scores`
- Quyền truy cập: Teacher
- Params: `classId`, `examInstanceId`.
- Response thành công: danh sách điểm.

## Dashboard / Report / Export

### Lấy dashboard giáo viên
- Method: GET
- Endpoint: `/api/teacher/dashboard`
- Quyền truy cập: Teacher
- Response thành công: thống kê dashboard.

### Xuất danh sách sinh viên CSV
- Method: GET
- Endpoint: `/api/teacher/export/students/:classId`
- Quyền truy cập: Teacher
- Params: `classId`.
- Response thành công: file CSV.

### Xuất kết quả thi CSV
- Method: GET
- Endpoint: `/api/teacher/export/results/:examId`
- Quyền truy cập: Teacher
- Params: `examId` là `exam_instance.id`.
- Response thành công: file CSV.

### Xuất nhật ký thi CSV
- Method: GET
- Endpoint: `/api/teacher/export/logs/:examId`
- Quyền truy cập: Teacher
- Params: `examId` là `exam_instance.id`.
- Response thành công: file CSV.

## Import đề thi

### Preview import câu hỏi
- Method: POST
- Endpoint: `/api/teacher/questions/import/preview`
- Quyền truy cập: Teacher
- Body: `multipart/form-data`, field file `file`.
- Upload file: `.docx`, `.pdf`, tối đa 20MB.
- Response thành công: `{ "success": true, "data": { "questions": [] } }`

### Confirm import câu hỏi
- Method: POST
- Endpoint: `/api/teacher/questions/import/confirm`
- Quyền truy cập: Teacher
- Body: `questions` array.
- Response thành công: `message`, `totalImported`, `questions`.

### Cleanup media import
- Method: POST
- Endpoint: `/api/teacher/questions/import/cleanup-media`
- Quyền truy cập: Teacher
- Body: `mediaUrls` array.
- Response thành công: `success`, `deleted`.

## API cũ/không còn sử dụng hoặc cần kiểm tra thêm

- `PUT /api/teacher/classes/:id/restore`: có controller/service nhưng không có route active.
- `GET /api/teacher/questions?includeDeleted=true`: service có option nhưng controller chưa đọc query.
- `/api/exam-import/*`: route/mount cũ bị comment; dùng `/api/teacher/questions/import/*`.
