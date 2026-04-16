require("dotenv").config();
const prisma = require("../prisma");
const hashPassword = require("../utils/hash").hashPassword;

async function main() {
  // 1. Tạo các role cần thiết (nếu chưa có)
  const roles = ["student", "teacher", "admin"];
  for (const name of roles) {
    await prisma.auth_role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("✅ Roles seeded");

  // 2. Lấy role Student
  const studentRole = await prisma.auth_role.findUnique({
    where: { name: "student" },
  });

  if (!studentRole) {
    console.error("❌ Không tìm thấy role 'student'");
    process.exit(1);
  }

  // 3. Tạo 10 tài khoản student
  const students = [];
  for (let i = 1; i <= 10; i++) {
    const paddedNum = String(i).padStart(2, "0");
    students.push({
      email: `student${paddedNum}@gmail.com`,
      name: `Student ${paddedNum}`,
      password: "P@ss",
    });
  }

  const hashedPassword = await hashPassword("P@ss");

  for (const student of students) {
    try {
      await prisma.user.upsert({
        where: { email: student.email },
        update: {},
        create: {
          name: student.name,
          email: student.email,
          password_hash: hashedPassword,
          role_id: studentRole.id,
          is_active: true,
        },
      });
      console.log(`✅ Đã tạo / cập nhật: ${student.email}`);
    } catch (err) {
      console.error(`❌ Lỗi khi tạo ${student.email}:`, err.message);
    }
  }

  console.log("\n🎉 Hoàn thành! 10 tài khoản student đã được tạo.");
  console.log("Mật khẩu chung: P@ss");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());