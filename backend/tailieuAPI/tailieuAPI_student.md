# TÀI LIỆU API

# API: Đăng ký & Đăng nhập

Tài liệu này mô tả các endpoint cơ bản để **đăng ký (register)**, **đăng nhập (login)**, **lấy thông tin user hiện tại**, và **refresh token**. 

---

## Tổng quan

- **Base URL (prod):** `https://api.example.com/`
- **Authentication:** Access token (Bearer JWT) cho các endpoint bảo vệ. Refresh token dùng để lấy access token mới.
- **Response format:** JSON
- **Time format:** ISO 8601 UTC (`2025-11-13T14:22:00Z`)

---

## Quy ước chung

- Header bắt buộc cho các request bảo vệ: `Authorization: Bearer <access_token>`
- Content-Type cho request body: `application/json`
- Mã lỗi chung: HTTP status + body dạng `{”error” :”MÔ TẢ LỖI“}`
- Mã thành công chung: HTTP status + body dang {”message”:”MÔ TẢ THÀNH CÔNG”}

---

## Endpoint 1 - Xin gia nhập lớp

**POST `/api/student/enroll`**

- **Mô tả: Học sinh xin gia nhập lớp **
- **HTTP:** POST 
- **URL:** `/api/student/enroll`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```json
{
    "classCode":"wyld1h50",
    "note":"Xin tham gia vào lớp Học lâp trình"
}
```

- **Response body:**

```json
{
    "newClass": {
        "id": "dfbcd5a0-7b47-4bdb-a15a-ec5b162ffb5b",
        "teacher_id": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "name": "Tin học đại cương",
        "code": "wyld1h50",
        "description": "Học lâp trình vào sáng t6",
        "created_at": "2025-12-05T11:33:34.257Z",
        "updated_at": "2025-12-05T11:33:34.257Z"
    },
    "message": "Lớp học đã được tạo thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```
## Endpoint 2 - Xem danh sách lớp có trạng thái [approved,pending]

**GET `/api/student/classes?status=approved`**

- **Mô tả: Học sinh xem danh sách lớp đang có trạng thái là status**
- **HTTP:** GET 
- **URL:** `/api/student/classes?status=...`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**

```json
[
    {
        "id": "dfbcd5a0-7b47-4bdb-a15a-ec5b162ffb5b",
        "teacher_id": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "name": "Tin học đại cương",
        "code": "wyld1h50",
        "description": "Học lâp trình vào sáng t6",
        "created_at": "2025-12-05T11:33:34.257Z",
        "updated_at": "2025-12-05T11:33:34.257Z"
    }
]
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```


## Endpoint 3 — Sinh viên rời lớp học  ( Dành cho sinh viên)

**DELETE`/api/student/classes/id`**

- **Mô tả: Sinh viên rời lớp học theo id của lớp**
- **HTTP: DELETE**
- **URL:** **`/api/student/classes/id`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **204 No Content**


- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

## Endpoint 4 — Sinh viên lấy danh sách đề thi trong lớp học  ( Dành cho sinh viên)

**GET`/api/student/exams/classes/:id`**

- **Mô tả: Sinh viên lấy danh sách đề thi trong lớp học theo id của lớp**
- **HTTP: POST**
- **URL:** **`/api/student/exams/classes/id`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 OK**
    

```json
[
    {
        "id": "7d19364a-f5ae-4f81-bcec-bd405f4a9460",
        "title": "Kỳ thi giữa kỳ môn Toán lớp 10A1",
        "starts_at": "2025-12-15T01:00:00.000Z",
        "ends_at": "2025-12-15T02:30:00.000Z",
        "duration": 3600,
        "passing_score": "5",
        "status": "ended" // Trạng thái: upcoming | ongoing | ended
    }
]
```

- upcoming: bài thi chưa bắt đầu
- ongoing: bài thi đang diễn ra
- ended: bài thi đã kết thúc

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

## Endpoint 5 — Bắt đầu kỳ thi (tạo phiên làm bài)

**POST `/api/student/exams/:id/start`**

- **Mô tả:** Tạo phiên làm bài cho học sinh đối với đề thi có `id`. Yêu cầu học sinh đã được duyệt vào lớp chứa đề thi, đề thi đã được công bố, và nằm trong khung thời gian cho phép.
- **HTTP:** POST
- **URL:** `/api/student/exams/:id/start`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**

```json
{
    "session_id": "b8b917f1-2d7b-4b5a-a6f6-2bbdd6d9a123",
    "token": "5f9c2e9c...", 
    "started_at": "2025-12-20T01:05:00.000Z",
    "ends_at": "2025-12-20T02:05:00.000Z",
    "duration_seconds": 3600,
    "state": "started",
    "questions": [
        {
            "id": "6257fb70-767d-455e-b0a9-c4cad3403fec",
            "text": "2 + 2 = ?",
            "ordinal": 1,
            "points": 1,
            "multichoice": true,
            "choices": [
                {"id": "...","label": "A","order": 0,"text": "3"},
                {"id": "...","label": "B","order": 1,"text": "4"}
            ]
        }
    ]
}
```

- **Các lỗi có thể gặp:**
- `404` — Đề thi không tồn tại
- `400` — Đề thi chưa công bố hoặc ngoài khung thời gian
- `403` — Học sinh chưa được duyệt vào lớp chứa đề thi
- `400` — Phiên làm bài đã kết thúc hoặc bị khóa

## Endpoint 6 — Lấy câu hỏi theo phiên thi

**GET `/api/student/sessions/:id/questions`**

- **Mô tả:** Trả về danh sách câu hỏi và lựa chọn cho phiên thi `:id`. Bắt buộc header `X-Exam-Token` kèm token phiên.
- **Headers:** `Authorization: Bearer <access_token>`, `X-Exam-Token: <session_token>`

**200 OK**
```json
[
    {
        "id": "6257fb70-767d-455e-b0a9-c4cad3403fec",
        "text": "2 + 2 = ?",
        "ordinal": 1,
        "points": 1,
        "multichoice": true,            
        "choices": [
            {"id": "...","label": "A","order": 0,"text": "3"},
            {"id": "...","label": "B","order": 1,"text": "4"}
        ],
        "selected_choice_ids": ["..."] // đáp án đã chọn (nếu có, hỗ trợ nhiều lựa chọn)
    }
]
```

## Endpoint 7 — Heartbeat phiên thi & chống gian lận cơ bản

**POST `/api/student/sessions/:id/heartbeat`**

- **Mô tả:** Cập nhật thời điểm hoạt động, ghi nhận mất focus (`focusLost: true/false`). Khi vượt ngưỡng (`EXAM_FOCUS_LOST_THRESHOLD`, mặc định 5) phiên sẽ bị `locked`.
- **Headers:** `Authorization: Bearer <access_token>`, `X-Exam-Token: <session_token>`
- **Body:**
```json
{ "focusLost": true }
```
- **200 OK**
```json
{ "state": "started", "focus_lost_count": 2, "locked": false }
```
- IP/UA mismatch được gắn cờ `session_flag` nhưng vẫn cho tiếp tục.

## Endpoint 8 — Lưu đáp án cho một câu hỏi trong phiên

**POST `/api/student/sessions/:id/answers`**

- **Mô tả:** Lưu hoặc ghi đè đáp án của một câu hỏi trong phiên. Mỗi câu hỏi một bản ghi, tự động upsert.
- **Headers:** `Authorization: Bearer <access_token>`, `X-Exam-Token: <session_token>`
- **Body:**
```json
{ "question_id": "6257fb70-767d-455e-b0a9-c4cad3403fec", "choice_ids": ["..."] }
```

**200 OK**
```json
{ "question_id": "6257fb70-767d-455e-b0a9-c4cad3403fec", "choice_ids": ["..."] }
```

- Lỗi có thể gặp: 404 (phiên không tồn tại), 403 (sai người), 400 (phiên hết hạn/không ở trạng thái started hoặc câu hỏi/choice không hợp lệ).

## Endpoint 9 — Nộp bài (submit exam)

**POST `/api/student/sessions/:id/submit`**

- **Mô tả:** Nộp bài sớm trước thời gian kết thúc. Chuyển state sang `submitted`, tính điểm tự động dựa trên đáp án đã lưu trong bảng `answer`, tạo bản ghi `submission`.
- **Headers:** `Authorization: Bearer <access_token>`, `X-Exam-Token: <session_token>`
- **Body:** (không cần)

**200 OK** (khi `show_answers = true`)
```json
{
  "submission_id": "...",
  "score": 8.5,
  "max_score": 10,
  "graded_at": "2025-12-21T02:35:00.000Z",
  "details": [
    {
      "question_id": "6257fb70-767d-455e-b0a9-c4cad3403fec",
      "correct": true,
      "points_earned": 1,
      "points_possible": 1
    }
  ]
}
```

**200 OK** (khi `show_answers = false` - mặc định)
```json
{
  "submission_id": "...",
  "score": 8.5,
  "max_score": 10,
  "graded_at": "2025-12-21T02:35:00.000Z"
}
```

- Sau khi submit, phiên chuyển sang `submitted` và không thể lưu thêm đáp án hay submit lại.
- Điểm tính tự động bằng cách so khớp tập `answer.selected_choice_ids` (hoặc `choice_id` cũ) với tập các lựa chọn `question_choice.is_correct = true`. Chỉ chấm đúng nếu khớp hoàn toàn (không thiếu, không thừa).
- Trường `details` (chi tiết từng câu đúng/sai) chỉ hiển thị nếu giáo viên cấu hình `show_answers = true` trong `exam_template`.

## Endpoint 10 — hủy yêu cầu tham gia lớp học

**POST `/api/student/classes/:id/cancel-enrollment`**

- **Mô tả:**  hủy yêu cầu tham gia lớp học.
- **Headers:** `Authorization: Bearer <access_token>`
- **Body:** (không cần)


- **Response body:**

- **204 No Content** 


- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

## Endpoint 10 — Lấy dashboard sinh viên

**GET `/api/student/dashboard`**

- **Mô tả:**  Lấy dashboard sinh viên
- **Headers:** `Authorization: Bearer <access_token>`
- **Body:** (không cần)


- **Response body:**

- **200 Ok** 
```json
{
    "classes": [
        {
            "id": "8409b373-5deb-43c0-9a23-dfc0cc162f84",
            "teacher_id": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
            "name": "Tin học đại cương",
            "code": "5ebscqj6",
            "description": "Học lâp trình vào sáng t6",
            "created_at": "2025-12-06T15:06:17.459Z",
            "updated_at": "2025-12-06T15:06:17.459Z"
        },
        {
            "id": "470383ba-9827-4e6b-80bb-2aab9a3873cd",
            "teacher_id": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
            "name": "tin hoc",
            "code": "6ey1dbl0",
            "description": "đâsasd",
            "created_at": "2025-12-25T09:15:33.851Z",
            "updated_at": "2025-12-25T09:15:33.851Z"
        }
    ],
    "averageScore": 6.25,
    "upcomingCount": 0,
    "completedCount": 4,
    "notAttemptedCount": 1,
    "notAttemptedExams": [
        {
            "examInstanceId": "4e02038d-1835-4acb-a4ab-edd7aaca03cb",
            "title": "aaa",
            "durationMinutes": 5,
            "starts_at": "2025-12-27T07:55:00.000Z",
            "ends_at": "2025-12-30T07:54:00.000Z",
            "class_id": "470383ba-9827-4e6b-80bb-2aab9a3873cd"
        }
    ]
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```