const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({
    select: {
      code: true,
      name: true,
      nameAr: true,
    }
  });
  console.log(JSON.stringify(accounts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
