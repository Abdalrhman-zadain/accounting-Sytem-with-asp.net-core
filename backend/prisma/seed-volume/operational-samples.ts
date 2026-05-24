import type { PrismaClient } from '../../src/generated/prisma';
import type { FoundationContext } from '../seed-foundation';
import type { VolumeMastersContext } from './masters';
import { createRng } from './rng';

export async function seedOperationalSamples(
  prisma: PrismaClient,
  ctx: FoundationContext,
  masters: VolumeMastersContext,
) {
  const rng = createRng(2026);

  for (let quarter = 0; quarter < 12; quarter += 1) {
    const year = 2024 + Math.floor(quarter / 4);
    const month = (quarter % 4) * 3 + 1;
    const invoiceDate = new Date(year, month, 15);
    const customerId = masters.customerIds[quarter % masters.customerIds.length];
    const total = 5000 + quarter * 750;

    await prisma.salesInvoice.create({
      data: {
        reference: `SINV-VOL-${year}-Q${Math.floor(quarter % 4) + 1}`,
        status: quarter % 5 === 0 ? 'DRAFT' : 'POSTED',
        invoiceDate,
        dueDate: new Date(year, month, 28),
        customerId,
        subtotalAmount: total,
        taxAmount: Math.round(total * 0.16 * 100) / 100,
        totalAmount: Math.round(total * 1.16 * 100) / 100,
        outstandingAmount: quarter % 3 === 0 ? Math.round(total * 1.16 * 100) / 100 : 0,
        allocationStatus: quarter % 3 === 0 ? 'UNALLOCATED' : 'FULLY_ALLOCATED',
        postedAt: quarter % 5 === 0 ? null : invoiceDate,
        lines: {
          create: [
            {
              lineNumber: 1,
              description: 'توريدات صناعية - عينة',
              quantity: rng.int(10, 120),
              unitPrice: 40,
              lineSubtotalAmount: total,
              taxAmount: Math.round(total * 0.16 * 100) / 100,
              lineAmount: Math.round(total * 1.16 * 100) / 100,
              revenueAccountId: ctx.accounts.salesRevenue.id,
            },
          ],
        },
      },
    });
  }

  for (let index = 0; index < 8; index += 1) {
    const supplierId = masters.supplierIds[index % masters.supplierIds.length];
    const invoiceDate = new Date(2025, index % 12, 10);
    const total = 3000 + index * 400;

    await prisma.purchaseInvoice.create({
      data: {
        reference: `PINV-VOL-2025-${String(index + 1).padStart(3, '0')}`,
        status: 'POSTED',
        invoiceDate,
        supplierId,
        subtotalAmount: total,
        taxAmount: Math.round(total * 0.16 * 100) / 100,
        totalAmount: Math.round(total * 1.16 * 100) / 100,
        postedAt: invoiceDate,
        lines: {
          create: [
            {
              lineNumber: 1,
              description: 'مشتريات مواد - عينة',
              quantity: rng.int(5, 80),
              unitPrice: 35,
              lineSubtotalAmount: total,
              taxAmount: Math.round(total * 0.16 * 100) / 100,
              lineTotalAmount: Math.round(total * 1.16 * 100) / 100,
              accountId: ctx.accounts.merchandiseInventory.id,
            },
          ],
        },
      },
    });
  }

  console.log('Operational sample documents created.');
}
