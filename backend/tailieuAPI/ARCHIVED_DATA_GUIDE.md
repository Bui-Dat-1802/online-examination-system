# HƯỚNG DẪN DỮ LIỆU XÓA MỀM / ARCHIVED DATA

Tài liệu này đã được rà lại theo route hiện tại. Một số API restore từng được ghi trong tài liệu cũ hiện **chưa được mount route**, dù controller/service có hàm tương ứng.

## API đang active liên quan dữ liệu archived

### Xem lớp học của giáo viên, có thể bao gồm lớp đã xóa
- Method: GET
- Endpoint: `/api/teacher/classes?includeDeleted=true`
- Quyền truy cập: Teacher
- Ghi chú: `teacherController.getClassesByTeacher` đọc query `includeDeleted`.

### Xem chi tiết lớp đã xóa
- Method: GET
- Endpoint: `/api/teacher/classes/:id?includeDeleted=true`
- Quyền truy cập: Teacher
- Ghi chú: `teacherController.getClassById` đọc query `includeDeleted`.

### Xem mẫu đề thi của giáo viên, có thể bao gồm đã xóa
- Method: GET
- Endpoint: `/api/teacher/exam-templates?includeDeleted=true`
- Quyền truy cập: Teacher
- Ghi chú: route active và controller truyền `includeDeleted`.

### Xem mẫu đề thi theo lớp, có thể bao gồm đã xóa
- Method: GET
- Endpoint: `/api/teacher/classes/:classId/exam-templates?includeDeleted=true`
- Quyền truy cập: Teacher
- Ghi chú: route active và controller truyền `includeDeleted`.

### Khôi phục câu hỏi
- Method: PUT
- Endpoint: `/api/teacher/questions/:id/restore`
- Quyền truy cập: Teacher
- Ghi chú: route active.

### Khôi phục mẫu đề thi
- Method: PUT
- Endpoint: `/api/teacher/exam-templates/:id/restore`
- Quyền truy cập: Teacher
- Ghi chú: route active.

### Khôi phục ca thi
- Method: PUT
- Endpoint: `/api/teacher/exam-instances/:id/restore`
- Quyền truy cập: Teacher
- Ghi chú: route active.

## API không còn đúng theo route hiện tại

### Khôi phục lớp học của giáo viên
- Endpoint cũ: `PUT /api/teacher/classes/:id/restore`
- Trạng thái: Không có trong `backend/src/routes/teacherRoutes.js`.
- Lý do: Có `teacherController.restoreClass` và `teacherService.restoreClass`, nhưng route chưa được khai báo.

### Khôi phục lớp học của admin
- Endpoint cũ: `PUT /api/admin/classes/:id/restore`
- Trạng thái: Không có trong `backend/src/routes/adminRoutes.js`.
- Lý do: Có `adminController.restoreClass` và `adminService.restoreClass`, nhưng route chưa được khai báo.

### Xem câu hỏi đã xóa bằng includeDeleted
- Endpoint cũ/cần kiểm tra: `GET /api/teacher/questions?includeDeleted=true`
- Trạng thái: Cần kiểm tra thêm.
- Lý do: `teacherService.getQuestionsbyTeacher` có option `includeDeleted`, nhưng `teacherController.getQuestionsbyTeacher` hiện gọi service không truyền query.

## Ghi chú nghiệp vụ

- Xóa lớp học trong service teacher/admin là xóa mềm và có thể cascade tới template/instance liên quan tùy service.
- Khôi phục class hiện chưa có route public, vì vậy tài liệu API không nên hướng dẫn frontend gọi restore class cho đến khi route được bổ sung.
- Khi cần xem dữ liệu archived để nộp ĐATN, ưu tiên các endpoint có `includeDeleted=true` đã được mount route ở trên.
