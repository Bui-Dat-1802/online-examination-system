// src/scripts/seed-teachers.js
const path = require("path");
const dotenv = require("dotenv");

// Load .env từ thư mục gốc
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = require("../prisma");
const hashPassword = require("../utils/hash").hashPassword;

async function main() {
  // 1. Đảm bảo role "teacher" tồn tại
  const teacherRole = await prisma.auth_role.upsert({
    where: { name: "teacher" },
    update: {},
    create: { name: "teacher" },
  });

  console.log("✅ Role 'teacher' ready");

  // 2. Hash password một lần
  const hashedPassword = await hashPassword("P@ss");

  // 3. Tạo 2 teacher
  const teachers = [
    { email: "teacher01@gmail.com", name: "Teacher 01" },
    { email: "teacher02@gmail.com", name: "Teacher 02" },
  ];

  console.log("\n👨‍🏫 Đang tạo Teacher...");

  for (const t of teachers) {
    await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        name: t.name,
        email: t.email,
        password_hash: hashedPassword,
        role_id: teacherRole.id,
        is_active: true,
      },
    });
    console.log(`   ✅ Created: ${t.email}`);
  }

  console.log("\n🎉 HOÀN THÀNH!");
  console.log("   • Teacher01@gmail.com");
  console.log("   • Teacher02@gmail.com");
  console.log("   • Mật khẩu: P@ss");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());