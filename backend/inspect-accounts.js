const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({
    orderBy: { code: 'asc' }
  });
  console.log('All Accounts:');
  for (const acc of accounts) {
    console.log(`Code: ${acc.code}, Name: ${acc.name}, NameAr: ${acc.nameAr}, Type: ${acc.type}, Subtype: ${acc.subtype}, ID: ${acc.id}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
