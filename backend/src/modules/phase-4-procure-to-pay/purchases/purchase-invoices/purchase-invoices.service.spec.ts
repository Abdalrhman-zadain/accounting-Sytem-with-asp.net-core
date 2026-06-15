import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma';

import { PurchaseInvoicesService } from './purchase-invoices.service';

describe('PurchaseInvoicesService', () => {
  const prisma = {
    $transaction: jest.fn(),
    purchaseInvoice: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    debitNote: {
      count: jest.fn(),
    },
    supplier: {
      update: jest.fn(),
    },
    supplierPayment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    supplierPaymentAllocation: {
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
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
  const postingService = {
    unpost: jest.fn(),
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
    prisma.purchaseInvoice.findUniqueOrThrow.mockReset();
    prisma.purchaseInvoice.update.mockReset();
    prisma.debitNote.count.mockReset();
    prisma.$transaction.mockReset();
    prisma.supplier.update.mockReset();
    prisma.supplierPayment.findUnique.mockReset();
    prisma.supplierPayment.update.mockReset();
    prisma.supplierPaymentAllocation.deleteMany.mockReset();
    prisma.supplierPaymentAllocation.aggregate.mockReset();
    postingService.unpost.mockReset();
    service = new PurchaseInvoicesService(
      prisma as never,
      {} as never,
      {} as never,
      postingService as never,
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

  it('unposts a fully paid purchase invoice for editing and detaches supplier payment allocations', async () => {
    const invoice = {
      id: 'pi-1',
      reference: 'PI-001',
      status: 'FULLY_PAID',
      journalEntryId: 'je-1',
      totalAmount: decimal(25),
      invoiceDate: new Date('2026-06-15T00:00:00.000Z'),
      supplierId: 'sup-1',
      supplier: { id: 'sup-1', isActive: true },
      _count: { debitNotes: 0, supplierAllocations: 1 },
    };
    const lockedInvoice = {
      ...invoice,
      journalEntry: { id: 'je-1', reference: 'JE-1' },
      supplierAllocations: [{ id: 'alloc-1', amount: decimal(25), supplierPaymentId: 'pay-1' }],
    };
    const updatedInvoice = {
      id: 'pi-1',
      reference: 'PI-001',
      status: 'DRAFT',
      journalEntryId: null,
      totalAmount: decimal(25),
      allocatedAmount: decimal(0),
      outstandingAmount: decimal(25),
      allocationStatus: 'UNALLOCATED',
      supplier: { id: 'sup-1', code: 'SUP-1', name: 'Supplier 1', defaultCurrency: 'JOD', isActive: true },
      lines: [],
      sourcePurchaseOrder: null,
      sourcePurchaseRequest: null,
      journalEntry: null,
      postedAt: null,
      _count: { debitNotes: 0, supplierAllocations: 0 },
    };
    const tx = {
      purchaseInvoice: {
        findUnique: jest.fn().mockResolvedValue(lockedInvoice),
        update: jest.fn().mockResolvedValue(undefined),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updatedInvoice),
      },
      supplierPaymentAllocation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: decimal(0) } }),
      },
      supplierPayment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'pay-1', amount: decimal(25) }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      supplier: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };

    prisma.purchaseInvoice.findUnique.mockResolvedValue(invoice);
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );
    jest
      .spyOn(service as any, 'reverseInventoryReceiptPosting')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, 'enrichAndMapPurchaseInvoices')
      .mockResolvedValue([{ id: 'pi-1', reference: 'PI-001', canUnpost: false }]);

    const result = await service.unpost('pi-1');

    expect(tx.supplierPaymentAllocation.deleteMany).toHaveBeenCalledWith({
      where: { purchaseInvoiceId: 'pi-1' },
    });
    expect(postingService.unpost).toHaveBeenCalledWith('je-1', tx);
    expect(tx.supplier.update).toHaveBeenCalledWith({
      where: { id: 'sup-1' },
      data: {
        currentBalance: {
          decrement: expect.anything(),
        },
      },
    });
    expect(tx.purchaseInvoice.update).toHaveBeenCalledWith({
      where: { id: 'pi-1' },
      data: expect.objectContaining({
        status: 'DRAFT',
        journalEntryId: null,
        allocatedAmount: expect.anything(),
        outstandingAmount: expect.anything(),
        allocationStatus: 'UNALLOCATED',
      }),
    });
    expect(tx.supplierPayment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: {
        allocatedAmount: expect.anything(),
        unappliedAmount: expect.anything(),
      },
    });
    expect(result).toEqual({ id: 'pi-1', reference: 'PI-001', canUnpost: false });
  });

  it('blocks unposting a purchase invoice that already has linked debit notes', async () => {
    prisma.purchaseInvoice.findUnique.mockResolvedValue({
      id: 'pi-1',
      status: 'POSTED',
      journalEntryId: 'je-1',
      supplier: { id: 'sup-1', isActive: true },
      _count: { debitNotes: 1, supplierAllocations: 0 },
    });

    await expect(service.unpost('pi-1')).rejects.toThrow(
      new BadRequestException('Purchase invoices with posted debit notes cannot be unposted.'),
    );
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
