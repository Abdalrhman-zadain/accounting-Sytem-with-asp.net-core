import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';

import { PurchaseInvoicesService } from './purchase-invoices.service';

describe('PurchaseInvoicesService', () => {
  const prisma = {
    purchaseInvoice: {
      findUnique: jest.fn(),
    },
    debitNote: {
      count: jest.fn(),
    },
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
  const reversalService = {
    reverse: jest.fn(),
  };
  const inventoryPostingService = {
    applyWarehouseBalance: jest.fn(),
    createMovement: jest.fn(),
  };

  let service: PurchaseInvoicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.tax.findMany.mockResolvedValue([]);
    prisma.purchaseInvoice.findUnique.mockReset();
    prisma.debitNote.count.mockReset();
    service = new PurchaseInvoicesService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      reversalService as never,
      inventoryPostingService as never,
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

  it('rejects reversing a purchase invoice that is already reversed', async () => {
    prisma.purchaseInvoice.findUnique.mockResolvedValue({
      id: 'pi-1',
      status: 'REVERSED',
      journalEntryId: 'je-1',
      allocatedAmount: 0,
      supplierId: 'sup-1',
      totalAmount: 10,
      supplier: { id: 'sup-1', isActive: true },
    });

    await expect(
      service.reverse('pi-1', { reversalDate: '2026-06-15' }),
    ).rejects.toThrow(new BadRequestException('هذه الفاتورة معكوسة مسبقاً'));
  });

  it('creates an OUT movement when reversing a purchase receipt movement', async () => {
    const tx = {
      inventoryStockMovement: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'move-1',
            transactionLineId: 'line-1',
            itemId: 'item-1',
            warehouseId: 'wh-1',
            quantityIn: decimal(100),
            valueIn: decimal(500),
            unitCost: decimal(5),
          },
        ]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      inventoryCostLayer: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'layer-1',
          remainingQuantity: decimal(100),
        }),
        update: jest.fn(),
      },
      inventoryItem: {
        update: jest.fn(),
      },
    };
    inventoryPostingService.applyWarehouseBalance.mockResolvedValue({
      id: 'bal-1',
      onHandQuantity: decimal(0),
      valuationAmount: decimal(0),
    });

    await (service as any).reverseInventoryReceiptPosting(tx, {
      id: 'pi-1',
      reference: 'PI-001',
      invoiceDate: new Date('2026-06-15T00:00:00.000Z'),
    });

    expect(tx.inventoryItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item-1' },
      }),
    );
    expect(inventoryPostingService.createMovement).toHaveBeenCalledWith(tx, expect.objectContaining({
      movementType: 'PURCHASE_RETURN',
      transactionType: 'PurchaseInvoice',
      transactionId: 'pi-1',
      transactionLineId: 'line-1',
      itemId: 'item-1',
      warehouseId: 'wh-1',
      quantityIn: new Prisma.Decimal(0),
      quantityOut: new Prisma.Decimal(100),
      valueIn: new Prisma.Decimal(0),
      valueOut: new Prisma.Decimal(500),
    }));
  });
});

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

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
