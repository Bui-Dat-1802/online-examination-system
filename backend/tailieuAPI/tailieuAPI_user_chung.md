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

## Endpoint 1.1 - đăng ký
**POST** `/api/auth/register-request`

- **Mô tả:** Tạo tài khoản mới.
- **HTTP:** `POST`
- **URL:** `/api/auth/register-request`
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
    "message": "OTP has been sent to your email"
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


## Endpoint 1.2 - xác nhận otp để đăng ký

**POST** `/api/auth/register-confirm`

- **Mô tả:** xác thực otp để Tạo tài khoản mới.
- **HTTP:** `POST`
- **URL:** `/api/auth/register-confirm`
- **Request body:**

```php
{
    "email": "student1@gmail.com",
    "otp": "142376"
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
{
    "message": "User registered successfully",
    "user_id": "0877ed37-f73e-44a8-983b-37bc203cc8a7"
}
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
- **URL:** **`/api/users/me`**
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
    "bio":"UPDATE BIO"
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



## Endpoint 7 — Quên mật khẩu

**POST `/api/auth/forgot-password`**

- **Mô tả:** Quên mật khẩu
- **HTTP:** POST
- **URL:** **`/api/auth/forgot-password`**
- **Request body:**

```json
{
    "email": "buixuandat1802@gmail.com"
}
```

- **Response body**
- **200 Ok** 

```json
{
    "message": "OTP has been sent to your email"
}
```

## Endpoint 8 — xác thực otp và đặt lại mật khẩu

**POST `/api/auth/reset-password`**

- **Mô tả:** xác thực otp và đặt lại mật khẩu mới
- **HTTP:** POST
- **URL:** **`/api/auth/reset-password`**
- **Request body:**

```json
{
    "email": "buixuandat1802@gmail.com",
    "otp": "246346",
    "newPassword": "P@ss3"
}
```

- **Response body**
- **200 Ok** 
```json
{
    "message": "Password reset successfully"
}
```

**400 Bad Request** 
```json
{
    "error": "OTP invalid or expired"
}
```

- gửi cả otp và mk mới luôn.
---


## Endpoint 9 — tìm kiếm lớp học theo tên

**GET `/api/auth/classes/search`**

- **Mô tả:** tìm kiếm lớp học theo tên
- **HTTP:** GET
- **URL:** **`/api/auth/classes/search`**

- **Response body**
- **200 Ok** 
```json
[
    {
        "id": "8409b373-5deb-43c0-9a23-dfc0cc162f84",
        "teacher_id": "a47756e3-57a3-4cc6-abf7-a7641203e96d",
        "name": "Tin học đại cương",
        "code": "5ebscqj6",
        "description": "Học lâp trình vào sáng t6",
        "created_at": "2025-12-06T15:06:17.459Z",
        "updated_at": "2025-12-06T15:06:17.459Z"
    }
]
```

**400 Bad Request** 
```json
{
    "error": "OTP invalid or expired"
}
```
