import { InventoryItemType } from '../../../../generated/prisma';

import { ItemImportService } from './item-import.service';

describe('ItemImportService', () => {
  const prisma = {
    inventoryItemGroup: { findMany: jest.fn() },
    inventoryItemCategory: { findMany: jest.fn() },
    inventoryUnitOfMeasure: { findMany: jest.fn() },
    inventoryItem: { findMany: jest.fn() },
  };

  const itemMasterService = {
    create: jest.fn(),
  };

  let service: ItemImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ItemImportService(prisma as never, itemMasterService as never);
    prisma.inventoryItemGroup.findMany.mockResolvedValue([
      {
        id: 'group-1',
        code: 'MARKET-DAIRY',
        isActive: true,
        inventoryAccountId: 'acc-inv',
        cogsAccountId: 'acc-cogs',
        salesAccountId: 'acc-sales',
        adjustmentAccountId: null,
      },
    ]);
    prisma.inventoryItemCategory.findMany.mockResolvedValue([
      {
        id: 'cat-1',
        code: 'MARKET-DAIRY',
        itemGroupId: 'group-1',
        isActive: true,
      },
    ]);
    prisma.inventoryUnitOfMeasure.findMany.mockResolvedValue([
      {
        id: 'uom-1',
        code: 'PCS',
        isActive: true,
      },
    ]);
    prisma.inventoryItem.findMany.mockResolvedValue([
      { code: 'MKT-001', barcode: '6291001001001' },
    ]);
  });

  it('previews a valid row with explicit market code', async () => {
    const result = await service.preview({
      rows: [
        {
          name: 'Fresh milk 1L',
          groupCode: 'MARKET-DAIRY',
          categoryCode: 'MARKET-DAIRY',
          unitCode: 'PCS',
          code: 'MKT-099',
        },
      ],
    });

    expect(result.summary.validCount).toBe(1);
    expect(result.rows[0].status).toBe('valid');
    expect(result.rows[0].resolved?.code).toBe('MKT-099');
  });

  it('marks missing group as error', async () => {
    const result = await service.preview({
      rows: [
        {
          name: 'Fresh milk 1L',
          groupCode: 'MISSING-GROUP',
          categoryCode: 'MARKET-DAIRY',
          unitCode: 'PCS',
        },
      ],
    });

    expect(result.summary.errorCount).toBe(1);
    expect(result.rows[0].status).toBe('error');
    expect(result.rows[0].errors.join(' ')).toContain('MISSING-GROUP');
  });

  it('skips duplicate existing codes', async () => {
    const result = await service.preview({
      rows: [
        {
          name: 'Duplicate item',
          groupCode: 'MARKET-DAIRY',
          categoryCode: 'MARKET-DAIRY',
          unitCode: 'PCS',
          code: 'MKT-001',
        },
      ],
      duplicatePolicy: 'skip',
    });

    expect(result.summary.skipCount).toBe(1);
    expect(result.rows[0].status).toBe('skip');
    expect(itemMasterService.create).not.toHaveBeenCalled();
  });

  it('flags barcode conflicts during preview', async () => {
    const result = await service.preview({
      rows: [
        {
          name: 'Duplicate barcode item',
          groupCode: 'MARKET-DAIRY',
          categoryCode: 'MARKET-DAIRY',
          unitCode: 'PCS',
          code: 'MKT-100',
          barcode: '6291001001001',
        },
      ],
    });

    expect(result.summary.errorCount).toBe(1);
    expect(result.rows[0].errors.join(' ')).toContain('Barcode');
  });

  it('imports valid rows and skips duplicates', async () => {
    itemMasterService.create.mockResolvedValue({
      id: 'item-2',
      code: 'MKT-100',
      name: 'New item',
      barcode: null,
    });

    const result = await service.import({
      rows: [
        {
          name: 'Duplicate item',
          groupCode: 'MARKET-DAIRY',
          categoryCode: 'MARKET-DAIRY',
          unitCode: 'PCS',
          code: 'MKT-001',
        },
        {
          name: 'New item',
          groupCode: 'MARKET-DAIRY',
          categoryCode: 'MARKET-DAIRY',
          unitCode: 'PCS',
          code: 'MKT-100',
          type: InventoryItemType.FINISHED_GOOD,
          defaultSalesPrice: '1.25',
        },
      ],
      duplicatePolicy: 'skip',
    });

    expect(result.summary.createdCount).toBe(1);
    expect(result.summary.skippedCount).toBe(1);
    expect(itemMasterService.create).toHaveBeenCalledTimes(1);
    expect(itemMasterService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'MKT-100',
        itemGroupId: 'group-1',
        itemCategoryId: 'cat-1',
        unitOfMeasureId: 'uom-1',
        inventoryAccountId: 'acc-inv',
        cogsAccountId: 'acc-cogs',
        salesAccountId: 'acc-sales',
        currencyCode: 'JOD',
      }),
    );
  });
});
