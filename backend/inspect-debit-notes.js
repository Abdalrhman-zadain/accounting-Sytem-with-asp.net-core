const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const notes = await prisma.debitNote.findMany({
    include: {
      lines: true,
      supplierDebitNoteType: true,
    }
  });
  console.log('Debit Notes Details:');
  for (const n of notes) {
    console.log(`\nNote ID: ${n.id}, Ref: ${n.reference}, Status: ${n.status}, Type: ${n.supplierDebitNoteType.code}`);
    for (const l of n.lines) {
      console.log(`  Line:`);
      console.log(`    Subtotal: ${l.lineSubtotalAmount}, Tax: ${l.taxAmount}, Total: ${l.lineTotalAmount}`);
      console.log(`    DiscountAccountId: ${l.discountAccountId}`);
      console.log(`    InventoryAccountId: ${l.inventoryAccountId}`);
      console.log(`    TotalCost: ${l.totalCost}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
