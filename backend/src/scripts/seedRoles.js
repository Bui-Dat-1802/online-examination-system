require("dotenv").config();
const prisma = require("../prisma");
const hashPassword = require("../utils/hash").hashPassword;
async function main() {
  const roles = ["student", "teacher", "admin"];
  for (const name of roles) {
     await prisma.auth_role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  const dataRoles = await prisma.auth_role.findMany(
    {
      where: {
        name : "admin"
      },
    }
  );

  console.log("Roles seeded");
  const adminUser = process.env.ADMIN_MAIL || "admin@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const hashedPassword = await hashPassword(adminPassword);
  await prisma.user.create({
    data: {
      name: "ADMIN",
      password_hash: hashedPassword,
      role_id: dataRoles[0].id,
      email: adminUser
    },
  });
  console.log("Admin user created with email:", adminUser, "and password:", adminPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());