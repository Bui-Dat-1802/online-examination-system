const prisma = require("../prisma");

async function main() {
  const now = await prisma.$queryRaw`SELECT NOW()`;
  console.log("DB time:", now[0]);

  const users = await prisma.user.findMany(); // hoặc prisma.User nếu model viết hoa – xem schema.prisma
  console.log("Users:", users);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
