import type { PrismaClient } from '../../src/generated/prisma';
import type { FoundationContext } from '../seed-foundation';
import type { VolumeSeedConfig } from './config';
import { createRng } from './rng';

export type VolumeMastersContext = {
  customerReceivableAccountIds: string[];
  customerIds: string[];
  supplierPayableAccountIds: string[];
  supplierIds: string[];
  warehouseIds: string[];
};

const CUSTOMER_NAMES = [
  'شركة النور للتجارة',
  'مؤسسة الأردن الحديث',
  'مجموعة الصفوة التجارية',
  'شركة الواحة للإمداد',
  'مخازن الشمال',
  'مؤسسة اليرموك',
  'شركة البحر الميت للتوريد',
  'مؤسسة الكرمل',
  'شركة الأفق الذهبي',
  'مؤسسة السهل المتكاملة',
];

export async function seedVolumeMasters(
  prisma: PrismaClient,
  ctx: FoundationContext,
  config: VolumeSeedConfig,
): Promise<VolumeMastersContext> {
  const rng = createRng(config.rngSeed + 11);
  const { admin, accounts, taxTreatmentTaxableId, segmentOptions } = ctx;

  const definitions = await prisma.segmentDefinition.findMany();
  const branchDef = definitions.find((row) => row.index === 4);
  if (branchDef) {
    for (const branch of ['AQB', 'ZRQ']) {
      await prisma.segmentValue.upsert({
        where: { definitionId_code: { definitionId: branchDef.id, code: branch } },
        update: {},
        create: {
          definitionId: branchDef.id,
          code: branch,
          name: branch === 'AQB' ? 'فرع العقبة' : 'فرع الزرقاء',
        },
      });
    }
    segmentOptions.branches.push('AQB', 'ZRQ');
  }

  const postingAccounts = await prisma.account.findMany({
    where: { isPosting: true, isActive: true },
    select: { id: true },
    take: 500,
  });

  for (const account of postingAccounts) {
    await prisma.account.update({
      where: { id: account.id },
      data: {
        segment3: rng.pick(segmentOptions.departments.length ? segmentOptions.departments : ['10']),
        segment4: rng.pick(segmentOptions.branches.length ? segmentOptions.branches : ['AMM']),
        segment5: rng.pick(segmentOptions.projects.length ? segmentOptions.projects : ['000']),
      },
    });
  }

  const customerReceivableAccountIds: string[] = [];
  const customerIds: string[] = [];

  for (let index = 0; index < config.customers; index += 1) {
    const code = `1122${String(index + 1).padStart(4, '0')}`;
    const receivableAccount = await prisma.account.create({
      data: {
        code,
        name: `AR - Customer ${index + 1}`,
        nameAr: `ذمم - عميل ${index + 1}`,
        type: 'ASSET',
        subtype: 'Receivable',
        isPosting: true,
        parentAccountId: accounts.customerReceivables.id,
        segment3: rng.pick(segmentOptions.departments),
        segment4: rng.pick(segmentOptions.branches),
        segment5: rng.pick(segmentOptions.projects),
        createdById: admin.id,
      },
    });

    const customer = await prisma.customer.create({
      data: {
        code: `CUS-${String(index + 1).padStart(4, '0')}`,
        name: `${CUSTOMER_NAMES[index % CUSTOMER_NAMES.length]} ${index + 1}`,
        taxTreatmentId: taxTreatmentTaxableId,
        creditLimit: 250000,
        receivableAccountId: receivableAccount.id,
        paymentTerms: 'Net 30',
      },
    });

    customerReceivableAccountIds.push(receivableAccount.id);
    customerIds.push(customer.id);
  }

  const supplierPayableAccountIds: string[] = [];
  const supplierIds: string[] = [];

  for (let index = 0; index < config.suppliers; index += 1) {
    const code = `2112${String(index + 1).padStart(4, '0')}`;
    const payableAccount = await prisma.account.create({
      data: {
        code,
        name: `AP - Supplier ${index + 1}`,
        nameAr: `ذمم - مورد ${index + 1}`,
        type: 'LIABILITY',
        subtype: 'Payable',
        isPosting: true,
        parentAccountId: accounts.payables.id,
        segment3: rng.pick(segmentOptions.departments),
        segment4: rng.pick(segmentOptions.branches),
        createdById: admin.id,
      },
    });

    const supplier = await prisma.supplier.create({
      data: {
        code: `SUP-${String(index + 1).padStart(4, '0')}`,
        name: `مورد ${index + 1} - توريدات صناعية`,
        payableAccountId: payableAccount.id,
        defaultCurrency: 'JOD',
      },
    });

    supplierPayableAccountIds.push(payableAccount.id);
    supplierIds.push(supplier.id);
  }

  const warehouses = await prisma.inventoryWarehouse.findMany({ take: 3 });
  const warehouseIds = warehouses.map((row) => row.id);

  const uom = await prisma.inventoryUnitOfMeasure.findFirstOrThrow({ where: { code: 'PCS' } });
  const itemGroups = await prisma.inventoryItemGroup.findMany({ take: 6 });
  const categories = await prisma.inventoryItemCategory.findMany({ take: 12 });

  if (!itemGroups.length || !categories.length) {
    console.log('Volume masters: skipped inventory item seeds because no item groups/categories are seeded.');
  }

  for (let index = 0; index < config.inventoryItems; index += 1) {
    if (!itemGroups.length || !categories.length) {
      break;
    }
    const group = itemGroups[index % itemGroups.length];
    const category = categories[index % categories.length];
    if (!group || !category) continue;

    await prisma.inventoryItem.create({
      data: {
        code: `ITM-VOL-${String(index + 1).padStart(5, '0')}`,
        name: `صنف تجاري ${index + 1}`,
        description: 'صنف تجريبي لمجموعة المبيقري الصناعية',
        unitOfMeasure: 'PCS',
        unitOfMeasureId: uom.id,
        itemGroupId: group.id,
        itemCategoryId: category.id,
        inventoryAccountId: accounts.merchandiseInventory.id,
        salesAccountId: accounts.salesRevenue.id,
        trackInventory: index % 4 !== 0,
        isActive: true,
      },
    });
  }

  for (let index = 0; index < config.employees; index += 1) {
    await prisma.employee.create({
      data: {
        code: `EMP-${String(index + 1).padStart(4, '0')}`,
        name: `موظف ${index + 1}`,
        joiningDate: new Date(2020, index % 12, 1),
      },
    });
  }

  console.log(`Volume masters: ${customerIds.length} customers, ${supplierIds.length} suppliers.`);

  return {
    customerReceivableAccountIds,
    customerIds,
    supplierPayableAccountIds,
    supplierIds,
    warehouseIds,
  };
}
