import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();
async function main() {
  const inv = await prisma.salesInvoice.findFirst({
    where: { reference: 'POS-20260601-0005' },
    include: { table: true }
  });
  console.log(JSON.stringify(inv, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
