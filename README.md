# Đồ án tốt nghiệp: Hệ thống thi trực tuyến

**Sinh viên thực hiện:** Bùi Xuân Đạt

## Giới thiệu

Đây là đồ án tốt nghiệp xây dựng một hệ thống thi trực tuyến phục vụ quá trình tổ chức, quản lý và làm bài thi trên nền tảng web. Hệ thống hỗ trợ ba nhóm người dùng chính: quản trị viên, giáo viên và học sinh. Mục tiêu của dự án là cung cấp một quy trình tương đối đầy đủ từ quản lý lớp học, ngân hàng câu hỏi, tạo đề thi, tổ chức phiên thi, giám sát quá trình làm bài, tự động chấm điểm đến xuất báo cáo kết quả.

Ứng dụng được thiết kế theo mô hình client-server. Frontend là ứng dụng React chạy trên trình duyệt, backend cung cấp REST API và WebSocket, dữ liệu được lưu trong PostgreSQL thông qua Prisma ORM. Ngoài các chức năng CRUD thông thường, hệ thống tập trung nhiều vào các nghiệp vụ đặc thù của thi trực tuyến như import câu hỏi từ file đề, xử lý ảnh/công thức trong đề thi, trộn câu hỏi/đáp án, quản lý thời gian làm bài theo phiên, ghi nhận vi phạm và xuất đề/kết quả phục vụ lưu trữ hoặc tái sử dụng.

## Chức năng chính

### Quản trị viên

- Quản lý tài khoản người dùng theo vai trò.
- Khóa, mở khóa tài khoản và đặt lại mật khẩu.
- Theo dõi danh sách lớp học, kỳ thi và thông tin chi tiết.
- Xem dashboard thống kê tổng quan hệ thống.
- Xuất báo cáo danh sách học sinh, kết quả thi và nhật ký thi dưới dạng CSV.

### Giáo viên

- Tạo và quản lý lớp học.
- Thêm học sinh vào lớp thủ công bằng email hoặc import từ file.
- Duyệt yêu cầu tham gia lớp của học sinh.
- Quản lý ngân hàng câu hỏi theo giáo viên.
- Tạo câu hỏi trắc nghiệm một đáp án, nhiều đáp án và câu điền khuyết.
- Gắn điểm, độ khó, tag và nội dung giải thích cho câu hỏi.
- Import câu hỏi từ file DOCX/PDF, xem trước kết quả parse, chỉnh sửa lỗi và xác nhận lưu vào ngân hàng câu hỏi.
- Tạo mẫu đề thi theo lớp, cấu hình thời lượng, điểm đạt, trộn câu hỏi và trộn đáp án.
- Tạo các lần thi cụ thể từ mẫu đề, đặt thời gian bắt đầu/kết thúc, trạng thái công bố và chế độ hiển thị đáp án.
- Theo dõi tiến độ làm bài của học sinh trong lớp.
- Gia hạn thời gian cho từng học sinh.
- Khóa/mở khóa phiên thi thủ công khi cần xử lý vi phạm.
- Xuất đề thi thành nhiều mã đề, có thể trộn thứ tự câu hỏi/đáp án và xuất kèm file đáp án CSV.
- Xuất kết quả thi và nhật ký thi phục vụ thống kê, đối soát.

### Học sinh

- Đăng ký, đăng nhập và tham gia lớp bằng mã lớp.
- Xem danh sách lớp học và các bài thi được công bố.
- Bắt đầu phiên thi trong khoảng thời gian hợp lệ.
- Làm bài trực tuyến với câu hỏi trắc nghiệm một đáp án, nhiều đáp án và điền khuyết.
- Lưu câu trả lời trong quá trình làm bài.
- Tự động nộp bài khi hết thời gian.
- Xem trạng thái bài thi và kết quả theo cấu hình của giáo viên.

## Import và export

Đây là một phần quan trọng của hệ thống vì đề thi thường được chuẩn bị sẵn ở dạng tài liệu.

### Import câu hỏi

Hệ thống hỗ trợ import câu hỏi từ:

- `.docx`
- `.pdf`

Quy trình import gồm hai bước:

1. **Preview:** backend đọc file, trích xuất nội dung, nhận diện câu hỏi, đáp án, loại câu hỏi và trả kết quả về frontend để giáo viên kiểm tra.
2. **Confirm:** giáo viên xác nhận danh sách câu hỏi hợp lệ, hệ thống lưu câu hỏi và lựa chọn đáp án vào cơ sở dữ liệu.

Các xử lý đáng chú ý:

- Đọc DOCX trực tiếp từ cấu trúc OpenXML bằng `JSZip`, `@xmldom/xmldom` và `xpath`.
- Trích xuất nội dung PDF bằng `pdf-parse`.
- Nhận diện block câu hỏi theo mẫu `Cau 1`, `Câu 1`, `Question 1`.
- Nhận diện lựa chọn theo nhãn `A.`, `B.`, `C.`... đến `Z`.
- Hỗ trợ đáp án inline, bảng đáp án cuối file và lựa chọn được đánh dấu đúng.
- Hỗ trợ câu điền khuyết thông qua dòng `Tra loi:` hoặc `Trả lời:`.
- Chuyển một phần công thức toán trong DOCX sang dạng LaTeX để hiển thị lại bằng KaTeX.
- Nếu công thức/ký hiệu không trích xuất đủ, hệ thống gắn cảnh báo để giáo viên kiểm tra trước khi lưu.
- Ảnh trong DOCX được đọc từ `word/media`, upload lên Cloudinary và đưa lại vào nội dung câu hỏi bằng markdown image.
- Có cơ chế dọn dẹp ảnh import tạm thời nếu giáo viên hủy import hoặc ảnh không còn được sử dụng.

### Import danh sách học sinh

Giáo viên có thể import danh sách email học sinh từ:

- `.csv`
- `.txt`
- `.xlsx`
- `.xls`
- `.docx`

Backend trích xuất email, chuẩn hóa về chữ thường, phát hiện email không hợp lệ và email trùng trước khi giáo viên xác nhận thêm vào lớp.

### Export đề thi

Giáo viên có thể xuất đề thi từ backend theo các định dạng:

- `.docx`
- `.txt`
- `.pdf`

Tính năng export đề thi hỗ trợ:

- Xuất một hoặc nhiều mã đề.
- Trộn thứ tự câu hỏi.
- Trộn thứ tự đáp án.
- Xuất kèm file đáp án `.csv`.
- Nếu có nhiều mã đề hoặc xuất kèm đáp án, backend đóng gói thành `.zip`.
- File DOCX được tạo theo chuẩn OpenXML bằng `JSZip`, có thể import lại vào hệ thống.
- Ảnh trong câu hỏi/đáp án được nhúng vào DOCX qua `word/media` và relationship của Word.
- PDF được render từ HTML bằng `puppeteer-core` nếu máy chủ có Chrome/Edge; nếu không có trình duyệt, hệ thống fallback sang PDF text đơn giản.

### Export báo cáo

Hệ thống hỗ trợ xuất CSV cho:

- Danh sách học sinh trong lớp.
- Kết quả thi.
- Nhật ký thi và sự kiện trong phiên thi.

## Công nghệ sử dụng

### Frontend

- **React 19:** xây dựng giao diện người dùng theo component.
- **Vite:** công cụ phát triển và build frontend.
- **React Router DOM:** quản lý routing cho các khu vực student, teacher và admin.
- **Axios:** gọi REST API từ frontend.
- **Socket.IO Client:** nhận cập nhật thời gian/phòng thi theo thời gian thực.
- **KaTeX:** hiển thị công thức toán trong câu hỏi.
- **React Toastify:** hiển thị thông báo.
- **Sass/SCSS:** tổ chức style theo module cho từng trang/component.

### Backend

- **Node.js + Express 5:** xây dựng REST API.
- **Socket.IO:** xử lý realtime cho phiên thi, đồng bộ thời gian, heartbeat và tự động nộp bài.
- **Prisma ORM:** truy cập PostgreSQL bằng schema typed.
- **PostgreSQL:** lưu dữ liệu người dùng, lớp học, câu hỏi, đề thi, phiên thi, câu trả lời, bài nộp và audit log.
- **JWT:** xác thực người dùng và phân quyền theo role.
- **bcrypt:** mã hóa mật khẩu.
- **Multer:** nhận file upload cho import câu hỏi, import học sinh và upload ảnh.
- **Cloudinary:** lưu trữ ảnh import từ đề thi và ảnh trong nội dung câu hỏi.
- **JSZip:** đọc và tạo file DOCX/ZIP.
- **@xmldom/xmldom + xpath:** parse XML trong DOCX.
- **pdf-parse:** trích xuất text từ PDF.
- **mammoth:** đọc text từ DOCX khi import danh sách học sinh.
- **xlsx:** đọc file Excel khi import danh sách học sinh.
- **KaTeX:** render công thức toán khi export đề.
- **puppeteer-core:** render HTML sang PDF khi export.
- **Nodemailer:** nền tảng gửi email cho các luồng tài khoản khi cần.
- **Morgan, CORS, dotenv:** logging, cấu hình CORS và biến môi trường.

## Kiến trúc thư mục

```text
DATN/
├── backend/
│   ├── prisma/                 # Prisma schema và migration
│   ├── src/
│   │   ├── config/             # Cấu hình hệ thống
│   │   ├── controllers/        # Controller cho auth, admin, teacher, student, import
│   │   ├── middleware/         # Auth, phân quyền, upload file
│   │   ├── routes/             # Định tuyến API
│   │   ├── services/           # Nghiệp vụ chính
│   │   ├── sockets/            # Xử lý Socket.IO cho phiên thi
│   │   └── utils/              # Parse file, shuffle đề, hash, helper
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Component dùng chung
│   │   ├── context/            # AuthContext, ModalContext
│   │   ├── layouts/            # Layout theo vai trò
│   │   ├── pages/              # Trang student/teacher/admin/auth
│   │   ├── services/           # Axios service
│   │   └── config/             # Cấu hình API/socket URL
│   └── package.json
└── README.md
```

## Cơ sở dữ liệu

Database chính là PostgreSQL. Một số nhóm bảng quan trọng:

- `user`, `auth_role`: người dùng và vai trò.
- `class`, `enrollment_request`: lớp học và yêu cầu tham gia lớp.
- `question`, `question_choice`: ngân hàng câu hỏi và các lựa chọn.
- `exam_template`: mẫu đề thi.
- `exam_instance`, `exam_question`: lần thi cụ thể và danh sách câu hỏi trong đề.
- `exam_session`: phiên làm bài của từng học sinh.
- `answer`, `submission`: câu trả lời và bài nộp.
- `audit_log`, `session_flag`: nhật ký hệ thống và ghi nhận vi phạm.
- `accommodation`: gia hạn thời gian theo từng học sinh.

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

Tạo file `.env` trong thư mục `backend` và cấu hình các biến môi trường cần thiết:

```env
PORT=3000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="your-secret"

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_FOLDER="online-exam"

CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

Khởi tạo Prisma Client và chạy backend:

```bash
npx prisma generate
npm run dev
```

Backend mặc định chạy tại:

```text
http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
```

Có thể cấu hình file `.env` trong thư mục `frontend`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

Chạy frontend:

```bash
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:5173
```

## Ghi chú triển khai

- Các API teacher, student và admin đều được bảo vệ bằng JWT và middleware phân quyền.
- Các thao tác xóa lớp, câu hỏi, mẫu đề và đề thi chủ yếu dùng soft delete để tránh mất dữ liệu liên quan.
- Phiên thi sử dụng heartbeat và Socket.IO để cập nhật trạng thái, hỗ trợ tự động nộp bài khi hết giờ.
- Khi import đề có ảnh, backend cần cấu hình Cloudinary để lưu ảnh và trả URL ổn định cho frontend.
- Export DOCX hiện được ưu tiên để file đề có thể import ngược lại vào hệ thống.

