import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();
async function main() {
  const latest = await prisma.salesInvoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { table: true }
  });
  console.log(JSON.stringify(latest, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
