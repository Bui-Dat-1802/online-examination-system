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
## Endpoint 7 — Tạo lớp học mới (Dành cho giáo viên)

**POST `/api/teacher/classes`**

- **Mô tả: Tạo lớp học mới gồm tên và mô tả**
- **HTTP:** POST
- **URL:** `/api/teacher/classes`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```json
{
    "name":"Tin học đại cương",
    "description":"Học lâp trình vào sáng t6"
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

---

## Endpoint 8 — Hiển thị danh sách lớp của giáo viên (Dành cho giáo viên)

**GET`/api/teacher/classes`**

- **Mô tả: hiển thị danh sách lớp của giáo viên khởi tạo**
- **HTTP: GET**
- **URL:** `/api/teacher/classes`
- **Query Parameters:**
  - `includeDeleted` (optional): `true` để xem cả lớp đã xóa mềm, mặc định `false`
- **Headers:** `Authorization: Bearer <access_token>`
- **Ví dụ:**
  - Chỉ lớp đang hoạt động: `GET /api/teacher/classes`
  - Bao gồm cả lớp đã xóa: `GET /api/teacher/classes?includeDeleted=true`
- **Response body:**

```json
[
    {
        "id": "a03cc090-d543-4474-96d5-1589d91f6027",
        "teacher_id": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "name": "Mật mã ứng dụng",
        "code": "tf7c2kbp",
        "description": "Học sáng t3",
        "created_at": "2025-12-02T01:28:39.768Z",
        "updated_at": "2025-12-02T01:28:39.768Z"
    },
    {
        "id": "7cc843fe-c081-40dc-ab17-5e1225eb8788",
        "teacher_id": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "name": "Mật mã ứng dụng",
        "code": "0cd6z39j",
        "description": "Học sáng t3",
        "created_at": "2025-12-02T01:29:07.409Z",
        "updated_at": "2025-12-02T01:29:07.409Z"
    },
    {
        "id": "ed874019-59a1-4f2f-9d73-53317cb39aac",
        "teacher_id": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "name": "Mật mã ứng dụng",
        "code": "cyp5dynw",
        "description": "Học sáng t3",
        "created_at": "2025-12-02T01:29:09.006Z",
        "updated_at": "2025-12-02T01:29:09.006Z"
    },
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

---

## Endpoint 9 — Hiển thị chi tiết lớp theo ID (Dành cho giáo viên)

**GET`/api/teacher/classes/:id`**

- **Mô tả: hiển thị chi tiết lớp theo ID của giảng viên**
- **HTTP: GET**
- **URL:** `/api/teacher/classes/:id`
- **Query Parameters:**
  - `includeDeleted` (optional): `true` để xem cả lớp đã xóa mềm, mặc định `false`
- **Headers:** `Authorization: Bearer <access_token>`
- **Ví dụ:**
  - Lớp đang hoạt động: `GET /api/teacher/classes/a03cc090-d543-4474-96d5-1589d91f6027`
  - Xem lớp đã xóa: `GET /api/teacher/classes/a03cc090-d543-4474-96d5-1589d91f6027?includeDeleted=true`
- **Response body:**

```json
{
    "classInfo": {
        "id": "a03cc090-d543-4474-96d5-1589d91f6027", 
        "teacher_id": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "name": "Mật mã ứng dụng",
        "code": "tf7c2kbp",
        "description": "Học sáng t3",
        "created_at": "2025-12-02T01:28:39.768Z",
        "updated_at": "2025-12-02T01:28:39.768Z"
    },
    "listStudent": [
        {
            "id": "4dcebb8b-0af9-4cb0-aea2-880bea25fca5",
            "class_id": "a03cc090-d543-4474-96d5-1589d91f6027",
            "student_id": "5d0ca9ae-d6f4-4633-8ca6-d41cf548d8fd",
            "status": "approved",
            "note": null,
            "requested_at": "2025-12-02T02:01:49.561Z",
            "reviewed_at": null,
            "reviewed_by": null,
            "studentInfo": {
                "id": "5d0ca9ae-d6f4-4633-8ca6-d41cf548d8fd",
                "email": "student1@gmail.com",
                "name": "student11",
                "role_name": "student"
            }
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

## Endpoint 10 — cập nhập thông tin lớp học theo ID lớp học ( dành cho giáo viên)

**PUT`/api/teacher/classes/:id`**

- **Mô tả: cập nhập thông tin lớp theo ID lớp học**
- **HTTP: PUT**
- **URL:** `/api/teacher/classes/:id`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```jsx
{
    "name":"Tin học đại cương 2",
    "description":"Học lâp trình vào sáng t5"
}
```

- **Response body:**

```jsx
{
    "updatedClass": {
        "id": "d072acb0-0407-497f-adca-fe54a0c97447",
        "teacher_id": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "name": "Tin học đại cương 2",
        "code": "fb93q6cn",
        "description": "Học lâp trình vào sáng t5",
        "created_at": "2025-12-06T14:46:48.875Z",
        "updated_at": "2025-12-06T14:49:14.405Z"
    },
    "message": "Cập nhật lớp học thành công"
}
```

**400 Bad Request** (sai ID lớp học)

```jsx
{
    "error": "Cập nhật thất bại"
}
```

## Endpoint 11 — Xóa lớp học theo ID lớp học (dành cho giáo viên)

**DELETE`/api/teacher/classes/:id`**

- **Mô tả: cập nhập thông tin lớp theo ID lớp học**
- **HTTP: DELETE**
- **URL:** `/api/teacher/classes/:id`
- **Headers:** `Authorization: Bearer <access_token>`
- **Response body:**
    
    **204 No Content (thành công)**
    
    **400Bad Request**
    
    ```jsx
    {
        "error": "Xóa lớp học thất bại"
    }
    ```
    

## Endpoint 12 — Lấy danh sách yêu cầu tham gia lớp bằng ID lớp học (Dành cho giáo viên)

**GET`/api/teacher/classes/:id/enrollment-requests`**

- **Mô tả: Lấy danh sách yêu cầu tham gia lớp bằng ID lớp học**
- **HTTP: GET**
- **URL:** `/api/teacher/classes/:id/enrollment-requests`
- **Headers:** `Authorization: Bearer <access_token>`
- **Response body:**
    
    **200 OK**
    

```jsx
[
    {
        "id": "72935d82-c151-4ee5-b46d-6c88ba0fa27f",
        "class_id": "8409b373-5deb-43c0-9a23-dfc0cc162f84",
        "student_id": "92a15ea0-3b9a-4cf4-9a13-ff26597aa53d",
        "status": "pending",
        "note": "xin cô vào lớp",
        "requested_at": "2025-12-06T15:19:31.916Z",
        "reviewed_at": null,
        "reviewed_by": null
    }
]
```

**400 Bad Request**

```jsx
{
    "error": "Lấy danh sách yêu cầu tham gia lớp học thất bại"
}
```

## Endpoint 13 — Phê duyệt hoặc từ chối yêu cầu tham gia lớp học (Dành cho giáo viên)

**POST`/api/teacher/enrollment-requests/approve`**

- **Mô tả: Phê duyệt hoặc từ chối yêu cầu tham gia lớp học**
- **HTTP: POST**
- **URL:** **`/api/teacher/enrollment-requests/approve`**
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```jsx
{
    "status": "approved", // Hoặc rejected nếu từ chối 
    "requestId": "72935d82-c151-4ee5-b46d-6c88ba0fa27f"

}
```

- **Response body:**
    
    **200 OK**
    

```jsx
{
    "message": "Cập nhật trạng thái yêu cầu thành công"
}
```

**400 Bad Request**

```jsx
{
    "error": "Cập nhật trạng thái yêu cầu thất bại"
}
```

## Endpoint 15 — Tạo câu hỏi ( Dành cho giáo viên)

**POST`/api/teacher/questions`**

- **Mô tả: Giáo viên tạo ngân hàng câu hỏi cho mình**
- **HTTP: POST**
- **URL:** **`/api/teacher/questions`**
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```jsx
{
    "text": "2 + 2 = ?",
    "tags": ["math"],
    "difficulty": "easy",
    "explanation": "Cộng 2 và 2",
    "choices": [
        { "order": 1,  "text": "3", "is_correct": false },
        { "order": 2,  "text": "4", "is_correct": true }
    ]
}
```

- **Response body:**
    
    **201 Created**
    

```json
{
    "newQuestion": {
        "id": "a8573bc2-7586-4fdc-9af3-db3ba88bfc84",
        "owner_id": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "text": "2 + 2 = ?",
        "explanation": "Cộng 2 và 2",
        "tags": [
            "math"
        ],
        "difficulty": "easy",
        "created_at": "2025-12-13T01:38:48.043Z",
        "updated_at": "2025-12-13T01:38:48.043Z",
        "question_choice": [
            {
                "id": "1060eca9-cb40-43d1-a692-9e4db0ac1e2e",
                "question_id": "a8573bc2-7586-4fdc-9af3-db3ba88bfc84",
                "label": null,
                "order": 1,
                "text": "3",
                "is_correct": false
            },
            {
                "id": "3b0d447e-8ecd-4e38-bc9d-54849523d087",
                "question_id": "a8573bc2-7586-4fdc-9af3-db3ba88bfc84",
                "label": null,
                "order": 2,
                "text": "4",
                "is_correct": true
            }
        ]
    },
    "message": "Câu hỏi đã được thêm thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```
## Endpoint 16 — Lấy danh sách câu hỏi ( Dành cho giáo viên)

**GET`/api/teacher/questions`**

- **Mô tả: Giáo viên lấy ngân hàng câu hỏi của mình**
- **HTTP: GET**
- **URL:** **`/api/teacher/questions`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 OK**
    

```json
[
    
    {
        "id": "b8ff6f0f-2433-495d-b6fc-a79f2350402c",
        "owner_id": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "text": "2 + 2 = ?",
        "explanation": "Cộng 2 và 2",
        "tags": [
            "math"
        ],
        "difficulty": "easy",
        "created_at": "2025-12-05T13:52:38.380Z",
        "updated_at": "2025-12-05T13:52:38.380Z",
        "question_choice": [
            {
                "id": "e5894dcf-adbf-4886-becc-019a422fceeb",
                "question_id": "b8ff6f0f-2433-495d-b6fc-a79f2350402c",
                "label": null,
                "order": 1,
                "text": "3",
                "is_correct": false
            },
            {
                "id": "fde3addc-44d4-4317-90a1-f599c2cd7234",
                "question_id": "b8ff6f0f-2433-495d-b6fc-a79f2350402c",
                "label": null,
                "order": 2,
                "text": "4",
                "is_correct": true
            }
        ]
    },
    {
        "id": "69466a53-87a1-46fd-b79e-c3adeb44efd0",
        "owner_id": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "text": "2 + 2 = ?",
        "explanation": "Cộng 2 và 2",
        "tags": [
            "math"
        ],
        "difficulty": "easy",
        "created_at": "2025-12-05T13:50:54.612Z",
        "updated_at": "2025-12-05T13:50:54.612Z",
        "question_choice": [
            {
                "id": "12f92c68-0b10-47ed-ae4c-828e0df05d8d",
                "question_id": "69466a53-87a1-46fd-b79e-c3adeb44efd0",
                "label": null,
                "order": 1,
                "text": "3",
                "is_correct": false
            },
            {
                "id": "e4964087-78ae-4b46-81f3-244e3bb904b7",
                "question_id": "69466a53-87a1-46fd-b79e-c3adeb44efd0",
                "label": null,
                "order": 2,
                "text": "4",
                "is_correct": true
            }
        ]
    }
]
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

## Endpoint 17 — Chỉnh sửa câu hỏi ( Dành cho giáo viên)

**PUT`/api/teacher/questions/:id`**

- **Mô tả: Giáo viên chỉnh sửa câu hỏi đã thêm vào ngân hàng câu hỏi. Trường nào muốn thay đổi thì sẽ thêm vào**
- **HTTP: PUT**
- **URL:** **`/api/teacher/questions/:id`**
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```jsx
{
    "text": "4 + 100 = ?",
    "tags": ["math"],
    "difficulty": "easy",
    "explanation": "Cộng 2 và 2",
    "choices": [
        { "order": 1,  "text": "102", "is_correct": true },
        { "order": 2,  "text": "4", "is_correct": false }
    ]
}
```

- **Response body:**
    
    **200 Created**
    

```json
{
    "message": "Cập nhật câu hỏi thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```
## Endpoint 18 — Xóa câu hỏi ( Dành cho giáo viên)

**DELETE`/api/teacher/questions/:id`**

- **Mô tả: Giáo viên xóa câu hỏi mà giáo viên đã từng thêm**
- **HTTP: DELETE**
- **URL:** **`/api/teacher/questions/:id`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 Created**
    

```json
{
    "message": "Cập nhật câu hỏi thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

## Endpoint 19 — Lấy chi tiết câu hỏi theo ID ( Dành cho giáo viên)

**GET`/api/teacher/questions/:id`**

- **Mô tả: Giáo viên chỉnh sửa câu hỏi theo ID câu hỏi**
- **HTTP: GET**
- **URL:** **`/api/teacher/questions/:id`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 Ok**
    

```json
{
    [
    {
        "id": "d9e64199-f9f1-454a-a641-97e67e011bb9",
        "owner_id": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "text": "TCP có phải là giao thức hướng kết nối không?",
        "explanation": "TCP thực hiện quá trình bắt tay 3 bước để tạo kết nối trước khi truyền dữ liệu.",
        "tags": [
            "network",
            "tcp",
            "protocol"
        ],
        "difficulty": "medium",
        "created_at": "2025-12-10T17:29:54.796Z",
        "updated_at": "2025-12-10T17:29:54.796Z",
        "question_choice": [
            {
                "id": "3eac3622-fb65-4cad-99f3-3e89ea08058f",
                "question_id": "d9e64199-f9f1-454a-a641-97e67e011bb9",
                "label": "A",
                "order": 0,
                "text": "Đúng",
                "is_correct": true
            },
            {
                "id": "4354609e-d05e-47b2-8c25-fbeb9656c967",
                "question_id": "d9e64199-f9f1-454a-a641-97e67e011bb9",
                "label": "B",
                "order": 1,
                "text": "Sai",
                "is_correct": false
            }
        ]
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

## Endpoint 20 — Tạo đề thi  ( Dành cho giáo viên)

**POST`/api/teacher/exam-instances`**

- **Mô tả: Giáo viên tạo đề thi**
- **HTTP: POST**
- **URL:** **`/api/teacher/exam-instances`**
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```jsx
{
  "templateId": "c0b39423-8d22-42ae-b50f-48d4ee0923cf",         
  "starts_at": "2025-12-15T08:00:00+07:00",     
  "ends_at": "2025-12-15T09:30:00+07:00",          
  "published": false,
  "show_answers": false,
  "questions": [
    {
        "question_id":"6257fb70-767d-455e-b0a9-c4cad3403fec"
    },
    {
        "question_id":"d9e64199-f9f1-454a-a641-97e67e011bb9"
    }
  ]                    
}
```

- **Response body:**
    
    **201 Created**
    

```json
{
    "newInstance": {
        "id": "fde5e3a2-6d68-4639-a456-08bc22f23617",
        "template_id": "c0b39423-8d22-42ae-b50f-48d4ee0923cf",
        "starts_at": "2025-12-15T01:00:00.000Z",
        "ends_at": "2025-12-15T02:30:00.000Z",
        "published": false,
        "created_by": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "created_at": "2025-12-13T04:51:19.411Z",
        "exam_question": [
            {
                "id": "27cf31c3-0c3a-48da-83c0-f18479f674b0",
                "exam_instance_id": "fde5e3a2-6d68-4639-a456-08bc22f23617",
                "question_id": "6257fb70-767d-455e-b0a9-c4cad3403fec",
                "ordinal": 0,
                "points": "1"
            },
            {
                "id": "19cc116b-7d23-4f2c-8bf4-d5dc6062d557",
                "exam_instance_id": "fde5e3a2-6d68-4639-a456-08bc22f23617",
                "question_id": "d9e64199-f9f1-454a-a641-97e67e011bb9",
                "ordinal": 1,
                "points": "1"
            }
        ]
    },
    "message": "Đề thi đã được tạo thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

## Endpoint 21 — xóa đề thi  ( Dành cho giáo viên)

**DELETE`/api/teacher/exam-instances/:id`**

- **Mô tả: Giáo viên xóa đề thi**
- **HTTP: DELETE**
- **URL:** **`/api/teacher/exam-instances/:id`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 OK**
    

```json
{
    "message": "Xóa đề thi thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```
    
- **500 Internal Server Error** (id đề thi sai, ko đúng quyền)

```json
{
    "error": "Không tìm thấy instance đề thi hoặc không có quyền xóa"
}
```

## Endpoint 22 — lấy danh sách đề thi theo template  ( Dành cho giáo viên)

**GET`/api/teacher/exam-templates/:templateId/exam-instances`**

- **Mô tả: Giáo viên xóa đề thi**
- **HTTP: GET**
- **URL:** **`/api/teacher/exam-templates/:templateId/exam-instances`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 OK**
    

```json
[
    {
        "id": "e7978e1d-41ec-4850-9005-b200f0f22cb4",
        "template_id": "c0b39423-8d22-42ae-b50f-48d4ee0923cf",
        "starts_at": "2025-12-15T01:00:00.000Z",
        "ends_at": "2025-12-15T02:30:00.000Z",
        "published": false,
        "created_by": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "created_at": "2025-12-13T04:57:12.643Z"
    },
    {
        "id": "fde5e3a2-6d68-4639-a456-08bc22f23617",
        "template_id": "c0b39423-8d22-42ae-b50f-48d4ee0923cf",
        "starts_at": "2025-12-15T01:00:00.000Z",
        "ends_at": "2025-12-15T02:30:00.000Z",
        "published": false,
        "created_by": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "created_at": "2025-12-13T04:51:19.411Z"
    }
]
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```
    
- **500 Internal Server Error** (id đề thi sai, ko đúng quyền)

```json
{
    "error": "Template đề thi không tồn tại hoăc không có quyền truy cập"
}
```

## Endpoint 23 — sửa đề thi theo id  ( Dành cho giáo viên)

**PUT`/api/teacher/exam-instances/:id`**

- **Mô tả: Giáo viên xóa đề thi**
- **HTTP: PUT**
- **URL:** **`/api/teacher/exam-instances/:id`**
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**
```jsx
{        
  "starts_at": "2025-12-15T08:00:00+07:00",     
  "ends_at": "2025-12-15T09:30:00+07:00",          
  "published": true,
  "questions": [
    {
        "question_id":"d9e64199-f9f1-454a-a641-97e67e011bb9"
    }
  ]                    
}
```

- **Response body:**
    
    **200 OK**
    

```json
{
    "updatedInstance": {
        "id": "7d19364a-f5ae-4f81-bcec-bd405f4a9460",
        "template_id": "c0b39423-8d22-42ae-b50f-48d4ee0923cf",
        "starts_at": "2025-12-15T01:00:00.000Z",
        "ends_at": "2025-12-15T02:30:00.000Z",
        "published": true,
        "created_by": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "created_at": "2025-12-13T08:48:24.824Z",
        "exam_question": [
            {
                "id": "95e29541-616f-496f-8f81-1912d644373e",
                "exam_instance_id": "7d19364a-f5ae-4f81-bcec-bd405f4a9460",
                "question_id": "d9e64199-f9f1-454a-a641-97e67e011bb9",
                "ordinal": 0,
                "points": "1"
            }
        ]
    },
    "message": "Cập nhật đề thi thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

## Endpoint 24 — lấy chi tiết đề thi theo id  ( Dành cho giáo viên)

**GET`/api/teacher/exam-instances/:id`**

- **Mô tả: Giáo viên xóa đề thi**
- **HTTP: GET**
- **URL:** **`/api/teacher/exam-instances/:id`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 OK**
    

```json
{
    "id": "7d19364a-f5ae-4f81-bcec-bd405f4a9460",
    "template_id": "c0b39423-8d22-42ae-b50f-48d4ee0923cf",
    "starts_at": "2025-12-15T01:00:00.000Z",
    "ends_at": "2025-12-15T02:30:00.000Z",
    "published": true,
    "created_by": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
    "created_at": "2025-12-13T08:48:24.824Z",
    "exam_question": [
        {
            "id": "95e29541-616f-496f-8f81-1912d644373e",
            "exam_instance_id": "7d19364a-f5ae-4f81-bcec-bd405f4a9460",
            "question_id": "d9e64199-f9f1-454a-a641-97e67e011bb9",
            "ordinal": 0,
            "points": "1"
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

## Endpoint 25 — Tìm kiếm sinh viên trong lớp học theo tên  ( Dành cho giáo viên)

**GET`/api/teacher/classes/:classId/students`**

- **Mô tả: Giáo viên xóa đề thi**
- **HTTP: PUT**
- **URL:** **`/api/teacher//classes/:classId/students`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 OK**
    

```json
[
    {
        "id": "92a15ea0-3b9a-4cf4-9a13-ff26597aa53d",
        "name": "student11",
        "email": "student1@gmail.com"
    }
]
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

## Endpoint 26 — Tạo template  ( Dành cho giáo viên)

**POST`/api/teacher/exam-templates`**

- **Mô tả: Giáo viên tạo đề thi**
- **HTTP: POST**
- **URL:** **`/api/teacher/exam-templates`**
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```jsx
{
    "title":"Kỳ thi cuối học kỳ 1 Môn Toán",
    "description":"Kỳ học 1234",
    "class_id":"a03cc090-d543-4474-96d5-1589d91f6027",
    "duration_seconds":3600,
    "shuffle_questions":false,
    "passing_score":30
}
```

- **Response body:**
    
    **201 Created**
    

```json
{
    "message": "Mẫu đề thi đã được tạo thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```
## Endpoint 27 — Lấy toàn bộ template của 1 giáo viên  ( Dành cho giáo viên)

**GET`/api/teacher/exam-templates`**

- **Mô tả: Giáo viên lấy toàn bộ danh sách template**
- **HTTP: GET**
- **URL:** **`/api/teacher/exam-templates`**
- **Query Parameters:**
  - `includeDeleted` (optional): `true` để xem cả template đã xóa mềm (bao gồm cả template từ lớp đã xóa), mặc định `false`
- **Headers:** `Authorization: Bearer <access_token>`
- **Ví dụ:**
  - Chỉ template đang hoạt động: `GET /api/teacher/exam-templates`
  - Bao gồm cả template đã xóa: `GET /api/teacher/exam-templates?includeDeleted=true`
- **Lưu ý:** Khi `includeDeleted=true`, response sẽ bao gồm thông tin `Renamedclass.is_deleted` để phân biệt template từ lớp đã xóa

- **Response body:**
    
    **200 OK**
    

```json
[
    {
        "id": "8519b687-237a-412d-8e04-e54b46a922cd",
        "class_id": "a03cc090-d543-4474-96d5-1589d91f6027",
        "title": "Kỳ thi cuối học kỳ 1 Môn Toán",
        "description": "Kỳ học 1234",
        "duration_seconds": 3600,
        "shuffle_questions": false,
        "passing_score": "30",
        "created_by": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "created_at": "2025-12-16T01:24:53.979Z"
    },
    {
        "id": "b6b4f31c-8aec-41b8-8752-df165e6915ce",
        "class_id": "a03cc090-d543-4474-96d5-1589d91f6027",
        "title": "Kỳ thi cuối học kỳ 1 Môn Toán",
        "description": "Kỳ học 1234",
        "duration_seconds": 3600,
        "shuffle_questions": false,
        "passing_score": "30",
        "created_by": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "created_at": "2025-12-12T10:22:39.245Z"
    }
]
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

## Endpoint 28 — Chỉnh template  ( Dành cho giáo viên)

**PUT`/api/teacher/exam-templates/:id`**

- **Mô tả: Giáo viên chỉnh sửa template theo các trường trong request gửi đi**
- **HTTP: PUT**
- **URL:** **`/api/teacher/exam-templates/:id`**
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```jsx
{
    "title":"Đã thay đổi",
    "description":"Đã thay đổi",
    "duration_seconds":1000,
    "shuffle_questions": true,
    "passing_score": 51
}
```

- **Response body:**
    
    **200 OK**
    

```json
{
    "updatedTemplate": {
        "id": "c7f33454-df9d-4b10-b0f8-d643abf2d13f",
        "class_id": "a03cc090-d543-4474-96d5-1589d91f6027",
        "title": "Đã thay đổi",
        "description": "Đã thay đổi",
        "duration_seconds": 1000,
        "shuffle_questions": true,
        "passing_score": "51",
        "created_by": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "created_at": "2025-12-12T10:18:04.360Z"
    },
    "message": "Cập nhật mẫu đề thi thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```
## Endpoint 29 — Xóa template theo id  ( Dành cho giáo viên)

**DELETE `/api/teacher/exam-templates/:id`**

- **Mô tả: Giáo viên xóa template**
- **HTTP: DELETE**
- **URL:** **`/api/teacher/exam-templates/:id`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 OK**
    

```json
{
    "message": "Xóa mẫu đề thi thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

## Endpoint 30 — Lấy toàn bộ template của 1 giáo viên theo keyword  ( Dành cho giáo viên)

**GET`/api/teacher/exam-templates/search`**

- **Mô tả: Giáo viên lấy toàn bộ danh sách template**
- **HTTP: GET**
- **URL:** **`/api/teacher/exam-templates/search?keyword={params}`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 OK**
    

```json
[
    {
        "id": "9d97c0f9-8b8a-4c66-aaea-4259cae79e6c",
        "class_id": "a03cc090-d543-4474-96d5-1589d91f6027",
        "title": "Đã thay đổi",
        "description": "Đã thay đổi",
        "duration_seconds": 1000,
        "shuffle_questions": true,
        "passing_score": "51",
        "created_by": "2f5d4ab2-d9a9-43f7-9175-9ec7f1ccc37c",
        "created_at": "2025-12-12T10:18:06.726Z"
    }
]
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```
## Endpoint 31 — Giáo viên công bố đề thi  ( Dành cho giáo viên)

**POST`/api/teacher/exam-instances/:id/publish`**

- **Mô tả: Giáo viên công bố đề thi cho sinh viên thấy**
- **HTTP: POST**
- **URL:** **`/api/teacher/exam-instances/:id/publish`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 OK**
    

```json
{
    "message": "Công bố đề thi thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```



## Endpoint 32 — Giáo viên hủy công bố đề thi  ( Dành cho giáo viên)

**POST`/api/teacher/exam-instances/:id/unpublish`**

- **Mô tả: Giáo viên hủy công bố đề thi không cho sinh viên thấy**
- **HTTP: POST**
- **URL:** **`/api/teacher/exam-instances/:id/unpublish`**
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**
    
    **200 OK**
    

```json
{
    "message": "Hủy công bố đề thi thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

---

## Endpoint 33 — Hiển thị học sinh đang thi trong lớp (Dành cho giáo viên)

**GET `/api/teacher/classes/:classId/active-students`**

- **Mô tả:** Trả về danh sách học sinh đang có phiên thi ở trạng thái `started` trong lớp chỉ định.
- **HTTP:** GET
- **URL:** `/api/teacher/classes/:classId/active-students`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**

**200 OK**

```json
[
    { "id": "a2c1...", "name": "Nguyễn Văn A" },
    { "id": "b3d4...", "name": "Trần Thị B" }
]
```

- **403 Forbidden** (lớp không thuộc giáo viên)

```json
{ "error": "Lớp học không tồn tại hoặc bạn không có quyền" }
```

- **401 Unauthorized** (missing/invalid token)

```json
{ "error": "Unauthorized" }
```
---

## Endpoint 34 — Thêm thời gian thi cho học sinh  (Dành cho giáo viên)

**POST `/api/teacher/exam-instances/:idKythi/accommodations`**

- **Mô tả:** Giáo viên cộng thêm thời gian làm bài cho một học sinh cụ thể trong đề thi.
- Nếu học sinh đã có phiên thi đang diễn ra, thời gian kết thúc phiên sẽ được kéo dài (không vượt quá `ends_at` của đề thi).
- **Headers:** `Authorization: Bearer <access_token>`

- **Request body:**

```json
{
    "student_id": "<uuid-hoc-sinh>",
    "extra_seconds": 600,
    "add_seconds": 300,
    "notes": "Thêm 10-15 phút do xác nhận y tế"
}
```

- **200 OK**

```json
{
    "accommodation": {
        "id": "...",
        "user_id": "...",
        "exam_instance_id": "...",
        "extra_seconds": 600,
        "notes": "Thêm 10 phút do xác nhận y tế",
        "created_at": "2025-12-23T01:00:00.000Z"
    },
    "message": "Cập nhật thêm thời gian thành công"
}
```

- **400 Bad Request**

```json
{ "error": "Thiếu student_id hoặc extra_seconds/add_seconds không hợp lệ" }
```

- **403 Forbidden** (đề thi không thuộc giáo viên)

```json
{ "error": "Đề thi không tồn tại hoặc bạn không có quyền" }
```

- **400 Bad Request** (học sinh không thuộc lớp/không được duyệt)

```json
{ "error": "Học sinh không thuộc lớp của đề thi hoặc chưa được duyệt" }
```

---

## Endpoint 35 — Danh sách vi phạm của học sinh trong lớp (Dành cho giáo viên)

**GET `/api/teacher/classes/:examID/flags`**

- **Mô tả:** Trả về các record trong `session_flag` thuộc lớp do giáo viên sở hữu.
- **HTTP:** GET
- **URL:** `/api/teacher/classes/:examID/flags`
- **Headers:** `Authorization: Bearer <access_token>`

- **Response body:**

```json
[{
        "id": "604920e8-6fc0-4a76-a9c0-b97f8c4193cc",
        "flag_type": "ua_mismatch",
        "details": "Phát hiện User-Agent không khớp",
        "created_at": "2025-12-27T05:49:54.984Z",
        "session_id": "42e3d31c-b1d7-4007-bc4f-7dd8a542bebd",
        "exam_instance_id": "f9c7e7c0-5636-4c8c-8947-5645e28a9cb7",
        "exam_template": {
            "id": "196e5932-28c5-40da-b254-bba8668bcc18",
            "title": "Đề thi Kiểm tra",
            "class_id": "1864fd85-bf81-4e26-828b-1dcf2b57cc6a"
        },
        "student": {
            "id": "5d0ca9ae-d6f4-4633-8ca6-d41cf548d8fd",
            "name": "student11",
            "email": "student1@gmail.com"
        },
        "flagged_by": null
    }, {
        "id": "d25cfc35-176f-40e6-9e9f-9411231407b3",
        "flag_type": "ua_mismatch",
        "details": "Phát hiện User-Agent không khớp",
        "created_at": "2025-12-27T05:49:24.989Z",
        "session_id": "42e3d31c-b1d7-4007-bc4f-7dd8a542bebd",
        "exam_instance_id": "f9c7e7c0-5636-4c8c-8947-5645e28a9cb7",
        "exam_template": {
            "id": "196e5932-28c5-40da-b254-bba8668bcc18",
            "title": "Đề thi Kiểm tra",
            "class_id": "1864fd85-bf81-4e26-828b-1dcf2b57cc6a"
        },
        "student": {
            "id": "5d0ca9ae-d6f4-4633-8ca6-d41cf548d8fd",
            "name": "student11",
            "email": "student1@gmail.com"
        },
        "flagged_by": null
    }
]
```

- **401 Unauthorized / 403 Forbidden** nếu không có quyền hoặc token không hợp lệ.

---

## Endpoint 36 — Khóa thủ công phiên thi (Dành cho giáo viên)

**POST `/api/teacher/exam-sessions/:session_id/lock`**

- **Mô tả:** Giáo viên tự khóa một `exam_session` của lớp mình.
- **HTTP:** POST
- **URL:** `/api/teacher/exam-sessions/:session_id/lock`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body (optional):**

```json
{ "reason": "Khóa vì mất focus nhiều lần" }
```

- **Response body:**

```json
{
    "sessionId": "sess-123",
    "state": "locked",
    "message": "Khóa phiên thi thành công"
}
```

- **400 / 404** nếu phiên không tồn tại, không thuộc giáo viên, đã hết hạn hoặc đã nộp.

---

## Endpoint 37 — Mở khóa thủ công phiên thi (Dành cho giáo viên)

**POST `/api/teacher/exam-sessions/:session_id/unlock`**

- **Mô tả:** Giáo viên mở khóa lại phiên đang ở trạng thái `locked`.
- **HTTP:** POST
- **URL:** `/api/teacher/exam-sessions/:session_id/unlock`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body (optional):**

```json
{ "reason": "Cho phép tiếp tục sau khi kiểm tra" }
```

- **Response body:**

```json
{
    "sessionId": "sess-123",
    "state": "started",
    "message": "Mở khóa phiên thi thành công"
}
```

- **400 / 404** nếu không ở trạng thái locked, hết hạn hoặc không thuộc giáo viên.


## Endpoint 37 — Lấy tất cả exam_instance của 1 lớp học (Dành cho giáo viên)

**GET `/api/teacher/classes/:classId/exam-instances`**

- **Mô tả:** Giáo viên lấy danh sách đề thi trong lớp học.
- **GET:** GET
- **URL:** `/api/teacher/classes/:classId/exam-instances`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**


- **Response body:**

```json
[
    {
        "id": "d1b7ceae-db5c-4a07-81d5-dfc05deb72dd",
        "template_id": "f54e9593-dd8c-4184-abb0-089c2e5e7e7c",
        "starts_at": "2026-12-15T01:00:00.000Z",
        "ends_at": "2026-12-16T02:30:00.000Z",
        "published": false,
        "created_by": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "show_answers": false,
        "created_at": "2025-12-20T09:59:01.840Z"
    },
    {
        "id": "7d19364a-f5ae-4f81-bcec-bd405f4a9460",
        "template_id": "c0b39423-8d22-42ae-b50f-48d4ee0923cf",
        "starts_at": "2025-12-15T01:00:00.000Z",
        "ends_at": "2025-12-15T02:30:00.000Z",
        "published": false,
        "created_by": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "show_answers": false,
        "created_at": "2025-12-13T08:48:24.824Z"
    }
]
```

- **400 / 404** nếu không ở trạng thái locked, hết hạn hoặc không thuộc giáo viên.


- **403 Forbidden**
```json
{
    "error": "Lớp học không tồn tại hoặc bạn không có quyền"
}
```

## Endpoint 38 — Lấy tiến độ làm bài thi của sinh viên trong lớp (Dành cho giáo viên)

**GET `/api/teacher/classes/:classId/exam-instances/:examInstanceId/progress`**

- **Mô tả:** Lấy tiến độ làm bài thi của sinh viên trong lớp.
- **GET:** GET
- **URL:** `/api/teacher/classes/:classId/exam-instances/:examInstanceId/progress`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**


- **Response body:**

```json
{
  "not_started": [
    { "id": "u1", "full_name": "Nguyễn Văn A" }
  ],
  "in_progress": [
    {
      "id": "u2",
      "full_name": "Trần Văn B",
      "started_at": "2025-01-10T08:10:00Z",
      "ends_at": "2025-01-10T09:40:00Z"
    }
  ],
  "finished": [
    {
      "id": "u3",
      "full_name": "Lê Văn C",
      "state": "submitted"
    }
  ]
}
```

- **400 / 404** nếu không ở trạng thái locked, hết hạn hoặc không thuộc giáo viên.

- **403 Forbidden**
```json
{
    "error": "Lớp học không tồn tại hoặc bạn không có quyền"
}
```

## Endpoint 39 — Lấy dashboard (Dành cho giáo viên)

**GET `/api/teacher/dashboard`**

- **Mô tả:** Lấy thông tin hiển thị dashboard.
- **GET:** GET
- **URL:** `/api/teacher/dashboard`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**


- **Response body:**

```json
{
    "stats": {
        "totalClasses": 5,
        "totalStudents": 2,
        "totalExams": 18,
        "totalQuestions": 14,
        "totalTemplates": 3
    },
    "recentActivities": [
        {
            "id": "440a10d5-715b-4ebf-b900-c2d245c71a3c",
            "type": "create_class",
            "description": "Tạo lớp học \"TIN HỌC ĐẠI CƯƠNG\"",
            "timestamp": "2025-12-24T07:21:15.112Z"
        },
        {
            "id": "5dceff08-479a-45f4-b4e7-b9a22450d1d8",
            "type": "create_question",
            "description": "Thêm câu hỏi: \"Tính đáp án của 5!...\"",
            "timestamp": "2025-12-24T07:23:32.332Z"
        },
        {
            "id": "f9a9619c-d768-4333-aff1-65327d87b792",
            "type": "create_exam_instance",
            "description": "Tạo đề thi \"Kỳ thi cuối học kỳ 1 Môn Toán\"",
            "timestamp": "2025-12-23T02:18:15.268Z"
        },
        {
            "id": "7d7d207c-4b1b-48ed-b6cc-a1d38c28e6ac",
            "type": "create_exam_instance",
            "description": "Tạo đề thi \"Kỳ thi cuối học kỳ 1 Môn Toán\"",
            "timestamp": "2025-12-23T01:49:41.368Z"
        },
        {
            "id": "c386540f-e9b6-429a-a602-257d01cfa15b",
            "type": "create_exam_instance",
            "description": "Tạo đề thi \"Kỳ thi cuối học kỳ 1 Môn Toán\"",
            "timestamp": "2025-12-23T01:19:34.898Z"
        },
        {
            "id": "e14b75af-4e5b-41b0-afaa-9591801f7efd",
            "type": "create_question",
            "description": "Thêm câu hỏi: \"2 + 2 = ?...\"",
            "timestamp": "2025-12-23T01:16:27.025Z"
        }
    ]
}
```

- **400** Lấy thông tin dashboard thất bại

---

## Endpoint 40 - Xuất danh sách học sinh trong lớp (CSV)

**GET `/api/teacher/export/students/:classId`**

- **Mô tả: Xuất danh sách học sinh trong lớp học ra file CSV**
- **HTTP:** GET 
- **URL:** `/api/teacher/export/students/:classId`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Parameters:**
  - `classId`: ID của lớp học cần xuất danh sách

- **Response:** File CSV với định dạng UTF-8 (BOM)
- **Content-Type:** `text/csv; charset=utf-8`
- **Filename:** `danh-sach-hoc-sinh-{classId}-{timestamp}.csv`

**Cấu trúc CSV:**
```
ID,Email,Họ tên,Trạng thái,Ngày tham gia lớp,Ngày tạo tài khoản,Đăng nhập gần nhất
"uuid","student@example.com","Nguyễn Văn A","Hoạt động","2025-09-01T00:00:00Z","2025-08-15T00:00:00Z","2025-12-27T10:30:00Z"
```

- **404 Not Found** (lớp học không tồn tại hoặc không có quyền)

```json
{
  "error": "Không tìm thấy lớp học hoặc bạn không có quyền truy cập"
}
```

---

## Endpoint 41 - Xuất kết quả thi (CSV)

**GET `/api/teacher/export/results/:examId`**

- **Mô tả: Xuất kết quả thi của một kỳ thi ra file CSV**
- **HTTP:** GET 
- **URL:** `/api/teacher/export/results/:examId`
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

- **403 Forbidden** (không có quyền truy cập kỳ thi)

```json
{
  "error": "Bạn không có quyền truy cập kỳ thi này"
}
```

- **404 Not Found** (kỳ thi không tồn tại)

```json
{
  "error": "Không tìm thấy kỳ thi"
}
```

---

## Endpoint 42 - Xuất nhật ký thi (CSV)

**GET `/api/teacher/export/logs/:examId`**

- **Mô tả: Xuất nhật ký hoạt động của một kỳ thi ra file CSV**
- **HTTP:** GET 
- **URL:** `/api/teacher/export/logs/:examId`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Parameters:**
  - `examId`: ID của kỳ thi cần xuất nhật ký

- **Response:** File CSV với định dạng UTF-8 (BOM)
- **Content-Type:** `text/csv; charset=utf-8`
- **Filename:** `nhat-ky-thi-{examId}-{timestamp}.csv`

**Cấu trúc CSV:**
```
Thời gian,Loại sự kiện,Người dùng,Email,Session ID,IP,User Agent,Chi tiết
"2025-12-27T09:00:00Z","EXAM_START","Nguyễn Văn A","student@example.com","session-uuid","192.168.1.100","Mozilla/5.0...","{"action":"started"}"
"2025-12-27T09:30:00Z","TAB_SWITCH","Nguyễn Văn A","student@example.com","session-uuid","192.168.1.100","Mozilla/5.0...","{"count":1}"
```

**Loại sự kiện thường gặp:**
- `EXAM_START`: Bắt đầu làm bài
- `EXAM_SUBMIT`: Nộp bài
- `TAB_SWITCH`: Chuyển tab
- `HEARTBEAT`: Tín hiệu định kỳ
- `ANSWER_SAVE`: Lưu câu trả lời

- **403 Forbidden** (không có quyền truy cập kỳ thi)

```json
{
  "error": "Bạn không có quyền truy cập kỳ thi này"
}
```

- **404 Not Found** (kỳ thi không tồn tại)

```json
{
  "error": "Không tìm thấy kỳ thi"
}
```

---


## Endpoint 43 — giáo viên lấy danh sách điểm của sinh viên trong lớp ở một kỳ thi (Dành cho giáo viên)

**GET `/api/teacher/classes/:classId/exam-instances/:examInstanceId/scores`**

- **Mô tả:** giáo viên lấy danh sách điểm của sinh viên trong lớp ở một kỳ thi
- **GET:** GET
- **URL:** `/api/teacher/classes/:classId/exam-instances/:examInstanceId/scores`
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**


- **Response body:**

```json
{
[
    {
        "user_id": "92a15ea0-3b9a-4cf4-9a13-ff26597aa53d",
        "name": "student11",
        "email": "student1@gmail.com",
        "state": "not_started",
        "score": 0,
        "max_score": 0,
        "graded_at": null
    },
    {
        "user_id": "92a15ea0-3b9a-4cf4-9a13-ff26597aa531",
        "name": "student2",
        "email": "student2@gmail.com",
        "state": "submitted",
        "score": 1,
        "max_score": 2,
        "graded_at": "2025-12-27T08:49:01.651Z"
    }    
]
}
```

- **400 / 404** nếu không ở trạng thái locked, hết hạn hoặc không thuộc giáo viên.

- **403 Forbidden**
```json
{
    "error": "Lớp học không tồn tại hoặc bạn không có quyền"
}
```

## Endpoint 44 — lấy danh sách template đề thi theo lớp học (Dành cho giáo viên)

**GET `/api/teacher/classes/:classId/exam-templates`**

- **Mô tả:** lấy danh sách template đề thi theo lớp học
- **GET:** GET
- **URL:** `/api/teacher/classes/:classId/exam-templates`
- **Query Parameters:**
  - `includeDeleted` (optional): `true` để xem cả template đã xóa mềm từ lớp này (ngay cả khi lớp đã bị xóa), mặc định `false`
- **Headers:** `Authorization: Bearer <access_token>`
- **Ví dụ:**
  - Chỉ template đang hoạt động: `GET /api/teacher/classes/:classId/exam-templates`
  - Xem cả template đã xóa: `GET /api/teacher/classes/:classId/exam-templates?includeDeleted=true`
- **Lưu ý:** Giáo viên có thể xem lại template của lớp đã xóa mềm nếu truyền `includeDeleted=true`
- **Request body:**


- **Response body:**

```json
{
[
    {
        "id": "f54e9593-dd8c-4184-abb0-089c2e5e7e7c",
        "class_id": "8409b373-5deb-43c0-9a23-dfc0cc162f84",
        "title": "Kỳ thi cuối học kỳ 1 Môn Toán",
        "description": "Kỳ học 1234",
        "duration_seconds": 3600,
        "shuffle_questions": true,
        "passing_score": "30",
        "created_by": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "created_at": "2025-12-20T09:53:38.458Z"
    },
    {
        "id": "c0b39423-8d22-42ae-b50f-48d4ee0923cf",
        "class_id": "8409b373-5deb-43c0-9a23-dfc0cc162f84",
        "title": "Kỳ thi giữa kỳ môn Toán lớp 10A1",
        "description": "Bài thi kiểm tra kiến thức chương 1 và chương 2. Bao gồm trắc nghiệm và tự luận.",
        "duration_seconds": 3600,
        "shuffle_questions": true,
        "passing_score": "5",
        "created_by": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "created_at": "2025-12-11T17:04:37.808Z"
    }
]
}
```

- **400 / 404** nếu không ở trạng thái locked, hết hạn hoặc không thuộc giáo viên.

- **403 Forbidden**
```json
{
    "error": "Lớp học không tồn tại hoặc bạn không có quyền"
}
```

## Endpoint 45 - Xóa học sinh ra khỏi lớp 


**DELETE`/api/teacher/classes/:classId/students/:studentId`**

- **Mô tả: cập nhập thông tin lớp theo ID lớp học**
- **HTTP: DELETE**
- **URL:** `/api/teacher/classes/:classId/students/:studentId`
- **Headers:** `Authorization: Bearer <access_token>`
- **Response body:**
    
    **200 OK (thành công)**
    ```js
    {
        "message": "Xóa học sinh khỏi lớp học thành công"
    }
    ```
    **400Bad Request**
    
    ```jsx
    {
        "error": "Xóa học sinh khỏi lớp học thất bại"
    }
    ```
