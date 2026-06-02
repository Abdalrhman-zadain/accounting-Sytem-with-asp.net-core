import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();

async function main() {
  const stuckTables = await prisma.posTable.findMany({
    where: {
      activeInvoice: {
        posOperationalStatus: {
          notIn: ['DRAFT', 'HELD']
        }
      }
    },
    include: { activeInvoice: true }
  });

  console.log(`Found ${stuckTables.length} stuck tables!`);

  for (const table of stuckTables) {
    console.log(`Fixing table ${table.tableNumber}... (Was stuck on invoice ${table.activeInvoice?.reference} - ${table.activeInvoice?.posOperationalStatus})`);
    await prisma.posTable.update({
      where: { id: table.id },
      data: {
        status: 'AVAILABLE',
        activeInvoiceId: null
      }
    });
  }
  console.log("Done fixing tables.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
