# Online Examination System - Backend

Backend của đồ án tốt nghiệp **Hệ thống thi trực tuyến**.

Backend cung cấp REST API và Socket.IO cho hệ thống web hỗ trợ quản trị viên, giáo viên và sinh viên trong quản lý lớp học, ngân hàng câu hỏi, đề thi, phiên thi, làm bài trực tuyến, chấm điểm, giám sát và xuất kết quả.

## Công nghệ

- Node.js
- Express 5
- Prisma ORM
- PostgreSQL
- Socket.IO
- JWT và bcrypt
- Multer
- Cloudinary
- JSZip, @xmldom/xmldom, xpath
- pdf-parse, mammoth, xlsx
- KaTeX
- puppeteer-core
- Nodemailer

## Cài đặt

```bash
cd backend
npm install
```

## Biến môi trường

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

Chỉ dùng giá trị mẫu trong tài liệu. Không commit secret thật lên repository.

## Chạy dự án

Sinh Prisma Client:

```bash
npx prisma generate
```

Chạy môi trường phát triển:

```bash
npm run dev
```

Chạy production/local thông thường:

```bash
npm start
```

Backend mặc định chạy tại `http://localhost:3000`.
