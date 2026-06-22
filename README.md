# Hệ thống thi trực tuyến

**Online Examination System**  
**Sinh viên thực hiện:** Bùi Xuân Đạt  
**Repository:** `Bui-Dat-1802/online-examination-system`

## Giới thiệu

Đây là đồ án tốt nghiệp xây dựng hệ thống web hỗ trợ quản trị viên, giáo viên và sinh viên trong quản lý lớp học, ngân hàng câu hỏi, đề thi, phiên thi, làm bài trực tuyến, chấm điểm, giám sát và xuất kết quả.

Ứng dụng được thiết kế theo mô hình client-server. Frontend là ứng dụng React/Vite chạy trên trình duyệt. Backend cung cấp REST API và Socket.IO, dữ liệu được lưu trong PostgreSQL thông qua Prisma ORM. Hệ thống tập trung vào các nghiệp vụ của thi trực tuyến như import câu hỏi từ file, xử lý ảnh và công thức trong đề thi, trộn câu hỏi/đáp án, quản lý thời gian làm bài theo phiên, ghi nhận vi phạm và xuất đề/kết quả phục vụ lưu trữ hoặc đối soát.

## Chức năng chính

### Quản trị viên

- Quản lý tài khoản người dùng theo vai trò.
- Khóa, mở khóa tài khoản và đặt lại mật khẩu.
- Theo dõi danh sách lớp học, kỳ thi và thông tin chi tiết.
- Xem dashboard thống kê tổng quan hệ thống.
- Xuất báo cáo danh sách sinh viên, kết quả thi và nhật ký thi dưới dạng CSV.

### Giáo viên

- Tạo và quản lý lớp học.
- Thêm sinh viên vào lớp thủ công bằng email hoặc import từ file.
- Duyệt yêu cầu tham gia lớp của sinh viên.
- Quản lý ngân hàng câu hỏi theo giáo viên.
- Tạo câu hỏi trắc nghiệm một đáp án, nhiều đáp án và câu điền khuyết.
- Import câu hỏi từ file DOCX/PDF, xem trước kết quả parse, chỉnh sửa lỗi và xác nhận lưu vào ngân hàng câu hỏi.
- Tạo mẫu đề thi theo lớp, cấu hình thời lượng, điểm đạt, trộn câu hỏi và trộn đáp án.
- Tạo các lần thi cụ thể từ mẫu đề, đặt thời gian bắt đầu/kết thúc, trạng thái công bố và chế độ hiển thị đáp án.
- Theo dõi tiến độ làm bài của sinh viên trong lớp.
- Gia hạn thời gian cho từng sinh viên.
- Khóa/mở khóa phiên thi thủ công khi cần xử lý vi phạm.
- Xuất đề thi thành nhiều mã đề, có thể trộn thứ tự câu hỏi/đáp án và xuất kèm file đáp án CSV.
- Xuất kết quả thi và nhật ký thi phục vụ thống kê, đối soát.

### Sinh viên

- Đăng ký, đăng nhập và tham gia lớp bằng mã lớp.
- Xem danh sách lớp học và các bài thi được công bố.
- Bắt đầu phiên thi trong khoảng thời gian hợp lệ.
- Làm bài trực tuyến với câu hỏi trắc nghiệm một đáp án, nhiều đáp án và điền khuyết.
- Lưu câu trả lời trong quá trình làm bài.
- Tự động nộp bài khi hết thời gian.
- Xem trạng thái bài thi và kết quả theo cấu hình của giáo viên.

## Import và export

### Import câu hỏi

Hệ thống hỗ trợ import câu hỏi từ `.docx` và `.pdf`.

Quy trình import gồm hai bước:

1. Preview: backend đọc file, trích xuất nội dung, nhận diện câu hỏi, đáp án, loại câu hỏi và trả kết quả về frontend để giáo viên kiểm tra.
2. Confirm: giáo viên xác nhận danh sách câu hỏi hợp lệ, hệ thống lưu câu hỏi và lựa chọn đáp án vào cơ sở dữ liệu.

Các xử lý đáng chú ý:

- Đọc DOCX trực tiếp từ cấu trúc OpenXML bằng `JSZip`, `@xmldom/xmldom` và `xpath`.
- Trích xuất nội dung PDF bằng `pdf-parse`.
- Nhận diện block câu hỏi theo mẫu `Cau 1`, `Câu 1`, `Question 1`.
- Hỗ trợ đáp án inline, bảng đáp án cuối file và lựa chọn được đánh dấu đúng.
- Hỗ trợ câu điền khuyết thông qua dòng `Tra loi:` hoặc `Trả lời:`.
- Chuyển một phần công thức toán trong DOCX sang LaTeX để hiển thị bằng KaTeX.
- Ảnh trong DOCX được upload lên Cloudinary và đưa lại vào nội dung câu hỏi bằng markdown image.

### Import danh sách sinh viên

Giáo viên có thể import danh sách email sinh viên từ `.csv`, `.txt`, `.xlsx`, `.xls` và `.docx`. Backend trích xuất email, chuẩn hóa về chữ thường, phát hiện email không hợp lệ và email trùng trước khi giáo viên xác nhận thêm vào lớp.

### Export đề thi

Giáo viên có thể xuất đề thi từ backend theo các định dạng `.docx`, `.txt` và `.pdf`.

Tính năng export đề thi hỗ trợ:

- Xuất một hoặc nhiều mã đề.
- Trộn thứ tự câu hỏi.
- Trộn thứ tự đáp án.
- Xuất kèm file đáp án `.csv`.
- Đóng gói `.zip` khi có nhiều mã đề hoặc xuất kèm đáp án.
- Nhúng ảnh trong câu hỏi/đáp án vào DOCX.
- Render PDF từ HTML bằng `puppeteer-core` nếu máy chủ có Chrome/Edge; nếu không có trình duyệt, hệ thống fallback sang PDF text đơn giản.

### Export báo cáo

Hệ thống hỗ trợ xuất CSV cho:

- Danh sách sinh viên trong lớp.
- Kết quả thi.
- Nhật ký thi và sự kiện trong phiên thi.

## Công nghệ sử dụng

### Frontend

- React 19
- Vite
- React Router DOM
- Axios
- Socket.IO Client
- KaTeX
- React Toastify
- Sass/SCSS với CSS Modules

### Backend

- Node.js và Express 5
- Socket.IO
- Prisma ORM
- PostgreSQL
- JWT và bcrypt
- Multer
- Cloudinary
- JSZip
- @xmldom/xmldom và xpath
- pdf-parse
- mammoth
- xlsx
- KaTeX
- puppeteer-core
- Nodemailer
- Morgan, CORS và dotenv

## Kiến trúc thư mục

```text
DATN/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── utils/
│   ├── tailieuAPI/
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── README.md
└── README.md
```

## Cơ sở dữ liệu

Database chính là PostgreSQL. Một số nhóm bảng quan trọng:

- `user`, `auth_role`: người dùng và vai trò.
- `class`, `enrollment_request`: lớp học và yêu cầu tham gia lớp.
- `question`, `question_choice`: ngân hàng câu hỏi và các lựa chọn.
- `exam_template`: mẫu đề thi.
- `exam_instance`, `exam_question`: lần thi cụ thể và danh sách câu hỏi trong đề.
- `exam_session`: phiên làm bài của từng sinh viên.
- `answer`, `submission`: câu trả lời và bài nộp.
- `audit_log`, `session_flag`: nhật ký hệ thống và ghi nhận vi phạm.
- `accommodation`: gia hạn thời gian theo từng sinh viên.

## Cài đặt và chạy dự án

### Yêu cầu môi trường

- Node.js
- PostgreSQL
- Tài khoản Cloudinary nếu sử dụng import ảnh từ DOCX
- Chrome hoặc Microsoft Edge nếu muốn export PDF bằng render HTML

### Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend` theo mẫu:

```env
PORT=3000

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

JWT_SECRET="replace-with-a-strong-secret"

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_FOLDER="online-exam"

CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"

EMAIL_USER="your-email@example.com"
EMAIL_PASS="your-email-app-password"

ADMIN_MAIL="admin@example.com"
ADMIN_PASSWORD="change-this-password"
```

Sinh Prisma Client và chạy backend:

```bash
npx prisma generate
npm run dev
```

Backend mặc định chạy tại `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
```

Tạo file `.env` trong thư mục `frontend` nếu cần:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

Chạy frontend:

```bash
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`.

## Ghi chú triển khai

- Các API teacher, student và admin đều được bảo vệ bằng JWT và middleware phân quyền.
- Các thao tác xóa lớp, câu hỏi, mẫu đề và đề thi chủ yếu dùng soft delete để tránh mất dữ liệu liên quan.
- Phiên thi sử dụng heartbeat và Socket.IO để cập nhật trạng thái, hỗ trợ tự động nộp bài khi hết giờ.
- Khi import đề có ảnh, backend cần cấu hình Cloudinary để lưu ảnh và trả URL ổn định cho frontend.
- Export DOCX được ưu tiên để file đề có thể import ngược lại vào hệ thống.
