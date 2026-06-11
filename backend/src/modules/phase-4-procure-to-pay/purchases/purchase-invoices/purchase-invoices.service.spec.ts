import { BadRequestException } from '@nestjs/common';

import { PurchaseInvoicesService } from './purchase-invoices.service';

describe('PurchaseInvoicesService', () => {
  const prisma = {
    account: {
      findMany: jest.fn(),
    },
    inventoryItem: {
      findMany: jest.fn(),
    },
    tax: {
      findMany: jest.fn(),
    },
    inventoryWarehouse: {
      findMany: jest.fn(),
    },
  };

  let service: PurchaseInvoicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.tax.findMany.mockResolvedValue([]);
    service = new PurchaseInvoicesService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { log: jest.fn() } as never,
    );
  });

  it('rejects inventory-tracked lines that use an expense account', async () => {
    prisma.account.findMany.mockResolvedValue([
      activeExpenseAccount('exp-1'),
    ]);
    prisma.inventoryItem.findMany.mockResolvedValue([
      trackedInventoryItem('item-1'),
    ]);
    prisma.inventoryWarehouse.findMany.mockResolvedValue([{ id: 'wh-1' }]);

    await expect(
      (service as any).resolveLines([
        invoiceLine({
          itemId: 'item-1',
          warehouseId: 'wh-1',
          accountId: 'exp-1',
        }),
      ]),
    ).rejects.toThrow(
      new BadRequestException('Inventory item lines must post to an active inventory asset account.'),
    );
  });

  it('accepts inventory-tracked lines that use an inventory asset account', async () => {
    prisma.account.findMany.mockResolvedValue([
      activeInventoryAssetAccount('inv-1'),
    ]);
    prisma.inventoryItem.findMany.mockResolvedValue([
      trackedInventoryItem('item-1'),
    ]);
    prisma.inventoryWarehouse.findMany.mockResolvedValue([{ id: 'wh-1' }]);

    const [resolvedLine] = await (service as any).resolveLines([
      invoiceLine({
        itemId: 'item-1',
        warehouseId: 'wh-1',
        accountId: 'inv-1',
        quantity: 3,
        unitPrice: 4.5,
      }),
    ]);

    expect(resolvedLine.accountId).toBe('inv-1');
    expect(resolvedLine.warehouseId).toBe('wh-1');
    expect(resolvedLine.lineSubtotalAmount).toBe(13.5);
    expect(resolvedLine.lineTotalAmount).toBe(13.5);
  });

  it('rejects service lines that use an inventory asset account', async () => {
    prisma.account.findMany.mockResolvedValue([
      activeInventoryAssetAccount('inv-1'),
    ]);
    prisma.inventoryItem.findMany.mockResolvedValue([
      serviceItem('item-2'),
    ]);
    prisma.inventoryWarehouse.findMany.mockResolvedValue([]);

    await expect(
      (service as any).resolveLines([
        invoiceLine({
          itemId: 'item-2',
          accountId: 'inv-1',
          warehouseId: '',
        }),
      ]),
    ).rejects.toThrow(
      new BadRequestException('Service or non-stock item lines must post to an active expense account.'),
    );
  });
});

function invoiceLine(overrides: Record<string, unknown> = {}) {
  return {
    itemId: '',
    itemName: 'Test line',
    warehouseId: '',
    description: 'Test purchase invoice line',
    quantity: 1,
    unitPrice: 10,
    discountAmount: 0,
    taxId: '',
    taxAmount: 0,
    accountId: 'acc-1',
    ...overrides,
  };
}

function activeInventoryAssetAccount(id: string) {
  return {
    id,
    type: 'ASSET',
    subtype: 'Inventory',
    isPosting: true,
  };
}

function activeExpenseAccount(id: string) {
  return {
    id,
    type: 'EXPENSE',
    subtype: null,
    isPosting: true,
  };
}

function trackedInventoryItem(id: string) {
  return {
    id,
    name: 'Tracked Item',
    type: 'FINISHED_GOOD',
    trackInventory: true,
    inventoryAccountId: 'inv-1',
    expenseAccountId: 'exp-1',
    preferredWarehouseId: 'wh-1',
  };
}

function serviceItem(id: string) {
  return {
    id,
    name: 'Service Item',
    type: 'SERVICE',
    trackInventory: false,
    inventoryAccountId: null,
    expenseAccountId: 'exp-1',
    preferredWarehouseId: null,
  };
}
