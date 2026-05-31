const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const notes = await prisma.debitNote.findMany({
    include: {
      supplier: {
        select: {
          payableAccountId: true,
          name: true,
        }
      },
      supplierDebitNoteType: true,
      lines: {
        include: {
          tax: true,
          item: true,
        }
      }
    }
  });

  console.log(`Found ${notes.length} debit notes:`);
  for (const note of notes) {
    console.log(`\nDebit Note Reference: ${note.reference}`);
    console.log(`Status: ${note.status}`);
    console.log(`Total Amount: ${note.totalAmount}`);
    console.log(`Subtotal Amount: ${note.subtotalAmount}`);
    console.log(`Tax Amount: ${note.taxAmount}`);
    console.log(`Payable Account ID: ${note.supplier.payableAccountId}`);
    console.log(`Lines Count: ${note.lines.length}`);
    
    // Simulate buildOffsetJournalLines
    const lines = [];
    const creditByAccount = new Map();
    const debitByAccount = new Map();
    const taxByAccount = new Map();
    const inventoryByAccount = new Map();
    
    for (const line of note.lines) {
      const accountId = line.discountAccountId;
      const baseAmount = note.supplierDebitNoteType.effect === 'TAX_ONLY'
        ? Number(line.amount)
        : Number(line.lineSubtotalAmount);
      
      console.log(`- Line: itemId=${line.itemId}, baseAmount=${baseAmount}, taxAmount=${line.taxAmount}, discountAccountId=${accountId}, inventoryAccountId=${line.inventoryAccountId}, totalCost=${line.totalCost}`);

      if (baseAmount > 0) {
        creditByAccount.set(
          accountId,
          Number(((creditByAccount.get(accountId) ?? 0) + baseAmount).toFixed(2)),
        );
      }
      
      const taxAmount = Number(line.taxAmount);
      if (taxAmount > 0) {
        // Just mock taxAccountId
        const taxAccountId = line.tax?.taxAccountId || 'MOCK_TAX_ACC';
        taxByAccount.set(
          taxAccountId,
          Number(((taxByAccount.get(taxAccountId) ?? 0) + taxAmount).toFixed(2)),
        );
      }

      const totalCost = Number(line.totalCost ?? 0);
      if (line.inventoryAccountId && totalCost > 0) {
        const offsetAccountId = line.discountAccountId;
        if (offsetAccountId) {
          debitByAccount.set(
            offsetAccountId,
            Number(((debitByAccount.get(offsetAccountId) ?? 0) + totalCost).toFixed(2)),
          );
        }
        inventoryByAccount.set(
          line.inventoryAccountId,
          Number(
            ((inventoryByAccount.get(line.inventoryAccountId) ?? 0) + totalCost).toFixed(2)
          ),
        );
      }
    }
    
    const debitLines = [
      { accountId: 'SupplierPayable', debitAmount: Number(note.totalAmount), creditAmount: 0 },
      ...Array.from(debitByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        debitAmount: amount,
        creditAmount: 0,
      }))
    ];
    
    const creditLines = [
      ...Array.from(creditByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        debitAmount: 0,
        creditAmount: amount,
      })),
      ...Array.from(taxByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        debitAmount: 0,
        creditAmount: amount,
      })),
      ...Array.from(inventoryByAccount.entries()).map(([accountId, amount]) => ({
        accountId,
        debitAmount: 0,
        creditAmount: amount,
      }))
    ];
    
    const totalDebit = debitLines.reduce((sum, l) => sum + l.debitAmount, 0);
    const totalCredit = creditLines.reduce((sum, l) => sum + l.creditAmount, 0);
    console.log(`Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`);
    console.log(`Difference: ${Math.abs(totalDebit - totalCredit)}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
