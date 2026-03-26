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

## Endpoint 1 — Đăng ký user

**POST** `/api/auth/register`

- **Mô tả:** Tạo tài khoản mới.
- **HTTP:** `POST`
- **URL:** `/api/auth/register`
- **Request body:**

```php
{
    "email": "student1@gmail.com",
    "name": "student11",
    "password": "P@ss",
    "role_name": "student"
}
```

- **Validations:**
    - `email`: required, phải là email hợp lệ
    - `password`: required, tối thiểu 8 ký tự, khuyến nghị có chữ hoa, chữ thường, số và ký tự đặc biệt
    - `role_name` : gồm [student, teacher]
- **Responses:**
    - **201 Created**

```json
{
    "message": "User registered successfully"
}
```

- **400 Bad Request** (ví dụ email đã tồn tại / validation failed)

```json
{
    "error": "Role not found for provided role_name: stucdent"
}
```

Notes:

- Hiển thị ra lỗi

---

## Endpoint 2 — Đăng nhập

**POST** `/api/auth/login`

- **Mô tả:** Xác thực user, trả về access token (JWT) và refresh token.
- **HTTP:** `POST`
- **URL:** `/api/auth/login`
- **Request body:**

```json
{

"email": "user@example.com",

"password": "P@ssw0rd!"

}
```

- **Responses:**
    - **200 OK**

```json
{
    "message": "Login successful",
    "user": {
        "id": "77122070-86a2-4bfb-9668-4ce95f3ef813",
        "email": "test1@gmail.com",
        "name": "student11",
        "password_hash": "$2b$10$TQZruD9zHZfdYaIEOIq0uOJ8cqRFmfkmgHOTXo42PzIE/Hg25kKr6",
        "role_name": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3MTIyMDcwLTg2YTItNGJmYi05NjY4LTRjZTk1ZjNlZjgxMyIsImlhdCI6MTc2NDU5NTIzMCwiZXhwIjoxNzY1MjAwMDMwfQ.7R8qmxI1jbXc2-ckG8DIkIDO8ql7ukBkdU-38mzuYWo",
    "refreshToken": "59c70737244349ff9a02a0350194fbd4208490e85d6ad33bf62fbbe88e763fc247f850d9401f63674541180384663415167c03de46fcf31cb591ba4209e069e1"
}
```

- **401 Unauthorized** (sai email/password)

```json
{
    "error": "Invalid credentials"
}
```

- **403 Forbidden** (tài khoản chưa verify email)

Security notes:

- Không gửi access token qua URL params.
- Access token ngắn hạn (ví dụ 1 giờ). Refresh token dài hơn và phải lưu an toàn (HttpOnly cookie hoặc secure store trên mobile).

---

## Endpoint 3 — Refresh token

**POST** `/api/auth/refresh`

- **Mô tả:** Dùng refresh token để lấy access token mới.
- **HTTP:** `POST`
- **URL:** `/api/auth/refresh`
- **Request body:**

```json
{
    "refreshToken":"48f14682ac9932d837b661f1696fb943049dd3909a2407a74f13b2cc20db956c4f142cca5f69d3dcd9ed5e9d826e69823039beeb896b755cf08c805d4f859fc5"
}
```

- **Responses:**
    - **200 OK**

```json
{
    "user": {
        "id": "77122070-86a2-4bfb-9668-4ce95f3ef813",
        "email": "test1@gmail.com",
        "name": "student11",
        "role_name": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc3MTIyMDcwLTg2YTItNGJmYi05NjY4LTRjZTk1ZjNlZjgxMyIsImlhdCI6MTc2NDU5NjQ4NCwiZXhwIjoxNzY1MjAxMjg0fQ._gt8XhQqdXpwL7KvmzxKu4BWtBZS_urUqBr3KNKRB6w",
    "refreshToken": "f0136affbfb5475e89282548192c8b608690efe5995271909c9b6ac3701acad7c752881078d2e0a9dedfc14ce81f1aedabcde1847e6c4aaee592af32b4d799d3"
}
```

- **401 Unauthorized** (refresh token invalid/expired) — yêu cầu user đăng nhập lại.

Implementation options:

- **Cookie-based:** server trả refresh token trong HttpOnly Secure cookie, client gửi cookie tự động.
- **Token-based:** client lưu refresh token và gửi trong body khi gọi `/api/auth/refresh`.

---

## Endpoint 4 — Lấy profile user hiện tại

**GET`/api/users/me`**

- **Mô tả:** Trả về thông tin user đang xác thực.
- **HTTP:** `GET`
- **URL:** **`/auth/users/me`**
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
    - **200 OK**

```json
{
    "id": "77122070-86a2-4bfb-9668-4ce95f3ef813",
    "email": "test1@gmail.com",
    "name": "student11",
    "password_hash": "$2b$10$TQZruD9zHZfdYaIEOIq0uOJ8cqRFmfkmgHOTXo42PzIE/Hg25kKr6",
    "role_id": "b5660a5d-d656-408e-9fb8-ad96f1d86eaa",
    "is_active": true,
    "created_at": "2025-12-01T13:19:48.684Z",
    "updated_at": "2025-12-01T13:19:48.684Z",
    "last_login_at": null,
    "bio": null
}
```

- **401 Unauthorized** (missing/invalid token)

---

## Endpoint 5 — Update profile user hiện tại

**PUT `/api/users/update`**

- **Mô tả:** cập nhật thông tin người dùng
- **HTTP:** PUT
- **URL:** **`/auth/users/update`**
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```json
{
    "name":"HEELLO",
    "bio":"UPDATE BIO",
    "password":"123"
}
```

- **Response body**

```json
{
    "message": "User updated successfully"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

- **Lưu ý: các trường update có thể có hoặc không**

---

## Endpoint 6 — Thay đổi mật khẩu

**PUT `/api/users/update-password`**

- **Mô tả:** cập nhật mật khẩu người dùng
- **HTTP:** PUT
- **URL:** **`/auth/users/update-password`**
- **Headers:** `Authorization: Bearer <access_token>`
- **Request body:**

```json
{
    "password":"123",
    "oldPassword":"123",
    "confirmPassword":"123"
}
```

- **Response body**

```json
{
    "message": "Cập nhật mật khẩu thành công"
}
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```

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
- **Headers:** `Authorization: Bearer <access_token>`
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
- **Headers:** `Authorization: Bearer <access_token>`
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

- **Mô tả: lấy danh sách đề thi theo template**
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

- **Mô tả: sửa đề thi theo id**
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

**PUT`/api/teacher/exam-instances/:id`**

- **Mô tả: lấy chi tiết đề thi theo id**
- **HTTP: PUT**
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

- **Mô tả: Tìm kiếm sinh viên trong lớp học theo tên**
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
- **Headers:** `Authorization: Bearer <access_token>`

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

## Endpoint 32 — Sinh viên lấy danh sách đề thi trong lớp học  ( Dành cho sinh viên)

**GET`/api/student/exams/classes/id`**

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
        "status": "ended"
    }
]
```

- **401 Unauthorized** (missing/invalid token)

```json
{
    "error": "Unauthorized"
}
```
